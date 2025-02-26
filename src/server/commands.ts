mp.events.addCommand('kill', (player) => {
	player.health = 0;
});

mp.events.addCommand('hp', (player) => {
	player.health = 100;
});

mp.events.addCommand('armor', (player) => {
	player.armour = 100;
});

mp.events.addCommand('money', (player, amount) => {
	player.setVariable('money', +amount);
});

export interface CarMarketItem {
	ownerId: number;
	carId: number;
	price: number;
}

export interface UserCarItem {
	model: number;
	numberPlate: string;
	id: number;
	forSale: boolean;
}

export const colshapes = [
	{ x: -1609, y: -880, z: 9.58, width: 5, depth: 5, height: 20, heading: -40, lotId: 1 },
	{ x: -1619, y: -872, z: 9.59, width: 5, depth: 5, height: 20, heading: -40, lotId: 2 },
	{ x: -1623, y: -868, z: 9.59, width: 5, depth: 5, height: 20, heading: -40, lotId: 3 },
	{ x: -1628, y: -864, z: 9.6, width: 5, depth: 5, height: 20, heading: -40, lotId: 4 },
	{ x: -1619, y: -853, z: 10, width: 5, depth: 5, height: 20, heading: 140, lotId: 5 },
	{ x: -1614, y: -857, z: 10, width: 5, depth: 5, height: 20, heading: 140, lotId: 6 },
	{ x: -1610, y: -861, z: 10, width: 5, depth: 5, height: 20, heading: 140, lotId: 7 }
];

export const colshapeObjects = colshapes.map((spot) => {
	const colshape = mp.colshapes.newCuboid(spot.x, spot.y, spot.z, spot.width, spot.depth, spot.height);
	colshape.position = new mp.Vector3(spot.x, spot.y, spot.z);
	colshape.setVariable('id', spot.lotId);
	return colshape;
});

export const market = new Map<number, CarMarketItem>();
export const carInventory = new Map<number, UserCarItem[]>();

mp.events.addCommand('car', (player, model) => {
	if (!model) return player.outputChatBox('Использование: /car [model]');
	const vehicle = mp.vehicles.new(mp.joaat(model), new mp.Vector3(player.position.x + 2, player.position.y, player.position.z), {
		heading: player.heading,
		numberPlate: 'TEST123',
		dimension: player.dimension
	});

	const playerCars = carInventory.get(player.id) || [];

	const newCar = {
		model: vehicle.model,
		numberPlate: vehicle.numberPlate,
		id: playerCars.length + 1,
		forSale: false
	};

	playerCars.push(newCar);
	carInventory.set(player.id, playerCars);
	vehicle.setVariable('id', newCar.id);
	vehicle.setVariable('preview', false);
	vehicle.setVariable('carModel', model);

	player.putIntoVehicle(vehicle, 0);
});

mp.events.addCommand('sell', (player, amount) => {
	if (!player.vehicle) return player.outputChatBox('Вы не в машине!');

	const playerCars = carInventory.get(player.id);
	if (!playerCars) {
		return;
	}
	const car = playerCars.find((item) => item.id === player.vehicle?.getVariable('id'));
	if (!car) return player.outputChatBox('Вы не владеете этой машиной!');

	const vehicle = mp.vehicles.toArray().find((value) => value.getVariable('id') === car.id);
	if (!vehicle) return;

	const playerPos = player.position;
	let closestColshape = null;
	let closestDistance = Infinity;
	let closestHeading = 0;
	let closestLotId = 0;

	for (let i = 0; i < colshapeObjects.length; i++) {
		const shape = colshapeObjects[i];
		const distance = playerPos.subtract(new mp.Vector3(colshapes[i].x, colshapes[i].y, colshapes[i].z)).length();
		if (distance < closestDistance) {
			closestDistance = distance;
			closestColshape = shape;
			closestHeading = colshapes[i].heading;
			closestLotId = colshapes[i].lotId;
		}
	}

	if (market.get(closestLotId)) return;

	if (!closestColshape || closestDistance > 10) {
		return player.outputChatBox('Вы не на парковочном месте!');
	}

	const previewVehicle = mp.vehicles.new(
		vehicle.model,
		new mp.Vector3(closestColshape.position.x, closestColshape.position.y, closestColshape.position.z),
		{
			heading: closestHeading,
			numberPlate: 'FORSALE',
			dimension: player.dimension
		}
	);
	previewVehicle.setVariable('preview', true);
	previewVehicle.movable = false;
	previewVehicle.locked = true;
	previewVehicle.setVariable('market_id', car.id);
	previewVehicle.setVariable('price', +amount);
	previewVehicle.setVariable('numberplate', vehicle.numberPlate);
	previewVehicle.setVariable('carModel', vehicle.getVariable('carModel'));
	previewVehicle.engine = false;

	vehicle.destroy();
	player.putIntoVehicle(previewVehicle, 0);

	market.set(closestLotId, { carId: car.id, ownerId: player.id, price: +amount });
	playerCars[playerCars.indexOf(car)] = { ...car, forSale: true };
	carInventory.set(player.id, playerCars);

	player.call('sellCar', [car.id, closestColshape.position.x, closestColshape.position.y, closestHeading]);
	setTimeout(() => player.removeFromVehicle(), 0);
});

mp.events.addCommand('buy', (player) => {
	const playerPos = player.position;
	const playerMoney = player.getVariable('money');

	let closestColshape = null;
	let closestDistance = Infinity;
	let closestLotId = 0;

	for (let i = 0; i < colshapeObjects.length; i++) {
		const shape = colshapeObjects[i];
		const distance = playerPos.subtract(new mp.Vector3(colshapes[i].x, colshapes[i].y, colshapes[i].z)).length();
		if (distance < closestDistance) {
			closestDistance = distance;
			closestColshape = shape;
			closestLotId = colshapes[i].lotId;
		}
	}

	if (!closestColshape || closestDistance > 10) {
		return player.outputChatBox('Рядом нет рынка');
	}

	const marketItem = market.get(closestLotId);

	if (!marketItem) {
		return player.outputChatBox('Рядом не машин на продажу');
	}

	if (playerMoney < marketItem.price) {
		return player.outputChatBox(`У вас недостаточно средств! Ваш баланс: ${playerMoney}$`);
	}

	const previewVehicle = mp.vehicles.toArray().find((value) => value.getVariable('market_id') === marketItem.carId);
	if (!previewVehicle) {
		return;
	}

	const owner = mp.players.toArray().find((value) => value.id === marketItem?.ownerId);
	if (!owner) {
		return;
	}

	const ownerCars = carInventory.get(owner.id) || [];

	ownerCars.splice(
		ownerCars.indexOf({
			forSale: true,
			id: +previewVehicle.getVariable('id'),
			model: previewVehicle.model,
			numberPlate: previewVehicle.getVariable('numberplate') || 'TEST'
		}),
		1
	);

	carInventory.set(owner.id, ownerCars);

	const playerCars = carInventory.get(player.id) || [];
	const newCar = {
		model: previewVehicle.model,
		numberPlate: previewVehicle.numberPlate,
		id: playerCars.length + 1,
		forSale: false
	};

	const vehicle = mp.vehicles.new(previewVehicle.model, previewVehicle.position, {
		heading: previewVehicle.heading,
		numberPlate: previewVehicle.getVariable('numberplate') || 'TEST123',
		dimension: player.dimension
	});

	player.setVariable('money', +player.getVariable('money') - marketItem.price);

	playerCars.push(newCar);
	carInventory.set(player.id, playerCars);
	vehicle.setVariable('id', newCar.id);
	vehicle.setVariable('preview', false);
	vehicle.setVariable('carModel', previewVehicle.getVariable('carModel'));
	previewVehicle.destroy();
	market.delete(closestLotId);
	player.putIntoVehicle(vehicle, 0);
	player.outputChatBox(`Вы успешно приобрели автомобиль. Ваш остаточный баланс: ${player.getVariable('money')}`);
});

mp.events.addCommand('nosale', (player) => {
	const playerPos = player.position;
	let closestColshape = null;
	let closestDistance = Infinity;
	let closestLotId = 0;

	for (let i = 0; i < colshapeObjects.length; i++) {
		const shape = colshapeObjects[i];
		const distance = playerPos.subtract(new mp.Vector3(colshapes[i].x, colshapes[i].y, colshapes[i].z)).length();
		if (distance < closestDistance) {
			closestDistance = distance;
			closestColshape = shape;
			closestLotId = colshapes[i].lotId;
		}
	}
	if (!closestColshape) {
		return player.outputChatBox('Рядом нет рынка');
	}

	const marketItem = market.get(closestLotId);

	if (!marketItem) {
		return player.outputChatBox('Рядом не машин на продажу');
	}

	const previewVehicle = mp.vehicles.toArray().find((value) => value.getVariable('market_id') === marketItem.carId);
	if (!previewVehicle) {
		return;
	}

	const owner = mp.players.toArray().find((value) => value.id === marketItem?.ownerId);
	if (!owner || owner.id !== player.id) {
		return player.outputChatBox('Вы не владеете этой машиной');
	}

	const playerCars = carInventory.get(player.id) || [];
	const newCar = {
		model: previewVehicle.model,
		numberPlate: previewVehicle.numberPlate,
		id: previewVehicle.getVariable('market_id'),
		forSale: false
	};

	const vehicle = mp.vehicles.new(previewVehicle.model, previewVehicle.position, {
		heading: previewVehicle.heading,
		numberPlate: previewVehicle.getVariable('numberplate') || 'TEST123',
		dimension: player.dimension
	});

	playerCars.forEach((value) => {
		if (value.id === previewVehicle.getVariable('market_id')) {
			value.forSale = false;
			return;
		}
	});
	carInventory.set(player.id, playerCars);
	vehicle.setVariable('id', newCar.id);
	vehicle.setVariable('preview', false);
	vehicle.setVariable('carModel', previewVehicle.getVariable('carModel'));
	previewVehicle.destroy();
	market.delete(closestLotId);
	player.putIntoVehicle(vehicle, 0);
	player.outputChatBox('Вы успешно сняли автомобиль с продажи');
});
