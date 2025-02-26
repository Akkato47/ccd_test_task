import { SpawnPoints as spawnPoints } from 'spawn_points.json';
import { colshapeObjects, market } from './commands';

mp.events.add('playerReady', (player) => {
	console.log(`${player.name} is ready!`);

	player.customProperty = 1;

	player.setVariable('money', 100000);

	player.customMethod = () => {
		console.log('customMethod called.');
	};

	player.customMethod();
});

mp.events.add('playerDeath', (player) => {
	const spawnSelected = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
	const position = new mp.Vector3(spawnSelected.x, spawnSelected.y, spawnSelected.z);
	player.spawn(position);
	player.health = 100;
});

mp.events.add('playerEnterColshape', (player, shape) => {
	const lot = colshapeObjects.find((item) => item === shape);

	const marketItem = market.get(+lot?.getVariable('id'));

	// if (marketItem && marketItem.ownerId !== player.id) {
	if (marketItem) {
		const car = mp.vehicles.toArray().find((value) => value.getVariable('market_id') === marketItem.carId);
		return player.outputChatBox(`Вы можете купить ${car?.getVariable('carModel')} за ${marketItem.price}$`);
	} // } else if (marketItem && marketItem.ownerId === player.id) {
	// 	return player.outputChatBox('Вы можете снять машину с продажи командой /nosale');
	// }

	if (colshapeObjects.includes(shape) && player.vehicle) {
		return player.outputChatBox('Вы можете продать машину командой /sell [цена]');
	}
});
