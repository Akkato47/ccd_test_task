import { SHARED_CONSTANTS } from '@shared/constants';

mp.events.add('playerReady', () => {
	mp.console.logInfo(`${mp.players.local.name} is ready!`);
	mp.console.logInfo(SHARED_CONSTANTS.HELLO_WORLD);

	mp.players.local.customProperty = 1;
	mp.console.logInfo(`customProperty: ${mp.players.local.customProperty}`);

	mp.players.local.customMethod = () => {
		mp.console.logInfo(`customMethod called.`);
	};
	mp.players.local.customMethod();
});

mp.events.add('render', () => {
	const pos = mp.players.local.position;
	mp.game.graphics.drawText(`X: ${pos.x.toFixed(2)} Y: ${pos.y.toFixed(2)} Z: ${pos.z.toFixed(2)}`, [0.5, 0.005], {
		font: 4,
		color: [255, 255, 255, 255],
		scale: [0.5, 0.5],
		outline: true
	});
});

mp.events.add('sellCar', (carId: number, x: number, y: number, heading: number) => {
	const z = mp.game.gameplay.getGroundZFor3dCoord(x, y, 1000, false, false) + 0.25;
	mp.console.logInfo(`${z}`);
	const vehicle = mp.vehicles.toArray().find((value) => value.getVariable('market_id') === carId);
	mp.console.logInfo(`${vehicle}`);

	if (!vehicle) {
		return;
	}
	vehicle.setHeading(heading);
	vehicle.position = new mp.Vector3(x, y, z);
	vehicle.setInvincible(true);
	vehicle.setProofs(true, true, true, true, true, true, true, true);
	vehicle.setCanBeDamaged(false);
	vehicle.setWheelsCanBreak(false);
	setTimeout(() => {
		vehicle.freezePosition(true);
	}, 1000);
	// mp.game.vehicle.getEntryPositionOfDoor(vehicle.id, 0);
	// mp.players.local.position = new mp.Vector3(x + 2, y, z);
});
