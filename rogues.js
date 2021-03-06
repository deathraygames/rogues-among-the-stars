import StarshipGenerator from './node_modules/starship-the-next-generation/src/StarshipGenerator.js';

const generator = new StarshipGenerator();

const g = new rote.Game({
	id: 'display',
	keyboard: 'multi-move',
	fontFamilies: ['Fix15MonoBold'],
	haveSplash: true,
	data: {
		monsters: 'data/monsters.json',
		items: 'data/items.json',
		props: 'data/props.json',
		levels: 'data/levels.json',
		abilities: 'data/abilities.json',
		playlist: 'data/playlist.json',
		dungeon: 'data/dungeon.json',
	},
	generators: {
		starship: generateStarshipMap
	},
	customEffects: {
		gameOver: gameOver,
	}
});
if (window) { window.g = g; }

const displayOptions = {
	width: 60,
	height: 30,
	fontSize: 20,
	fontFamily: "Fix15MonoBold" // alternatives: "AppleII" or "White Rabbit"
};

function gameOver() {
	g.print(`
		The runes along the walls begin to glow as a magical energy courses
		through the ship. You can set off on new adventures in your new ship...`,
		'plot'
	);
	g.print('GAME OVER');
}

function generateStarshipMap(seed, map, mapOptions) {
	// TODO: ??
	const ship = generator.generate({ seed });
	console.log(ship, arguments);
	ship.parts.forEach((part) => {
		if (part.isPassable()) {
			map.setFloorAt(part.x, part.y);
		} else {
			map.setWallAt(part.x, part.y);
		}
	});
}

g.addHook('afterTeleportLevel', (data, game) => {
	if (!data.levelIndex) { return; }
	if (game.hero.xp < data.levelIndex) {
		game.hero.xp += 1;
		game.hero.score += (10 * data.levelIndex);
		game.hero.gainRandomAbility(g.data.abilities);
		game.hero.gainRandomPoolMax();
		game.print('Ding! You gain experience.', 'tip')
	}
});

function createPlayerCharacter(level) {
	const { x, y } = level.findRandomFreeCell();
	g.createHero({
		x, y, name: 'Rogue', sightRange: 6,
		color: '#df2',
		hp: 8, ap: 3, bp: 3, ep: 3, wp: 1,
		faction: 'RATS'
	});
	// g.hero.inventory.add( new rote.Item({ name: 'Beard comb', character: "⋹" }) );
	g.hero.inventory.add( new rote.Item({ name: 'Toga', character: "⌓" }) );
	const numberOfLevels = 5; // TODO: calculate this?
	const startingAbilities = 9 - (numberOfLevels - 1);
	for(let i = 0; i < startingAbilities; i++) {
		g.hero.gainRandomAbility(g.data.abilities);
	}
}

function setupMachinery(level) {
	// level.findPropsByType('extractor');
	// level.findPropsByType('extractorSwitch');
}

function getAbilityHtml(hero, index) {
	const ability = hero.getAbilityByIndex(index);
	if (!ability) {
		return `<li class="none"></li>`;
	}
	const costs = Object.keys(ability.readyCost);
	let costsHtml = '';
	costs.forEach((costKey) => {
		const max = ability.readyCost[costKey];
		const fill = (ability.isReadied) ? max : 0;
		costsHtml += getPoolHtml(costKey, fill, max, 0);
	});
	return `
	<li title="${ability.description}" class=${ability.isReadied ? 'ready' : ''}>
		<span class="number">${index + 1}</span>
		<span>${ability.name}</span>
		${costsHtml}
		<div class="description">
			${rote.Actor.getAbilityDescriptionHtml(ability)}
		</div>
	</li>`;
}

function getPoolHtml(key, a, b, c) {
	return `<span class="pool ${key}-pool" title="${a}/${b}">${rote.Display.getPoolSquares(a, b, c)}</span>`
}

function drawInterface(game, hero) {
	const level = game.getActiveLevel();
	const intElt = document.getElementById('interface');
	const deadHtml = hero.dead() ? `<div class="dead">DEAD</div>` : '';
	const used = hero.getAbilityReadiedAmounts();
	intElt.innerHTML = (`
		<ul class="stats">
		<li><span title="${level.description}">Ship: ${game.activeLevelIndex + 1} / ${game.levels.length}</span>
			<span class="score">Score: ${hero.score}</span>
		</li>
		<li>Weapon Damage: ${hero.getWeaponDamage()}</li>
		<li class="hp"><span title="hit points">HP:</span> ${getPoolHtml('hp', hero.hp, hero.hpMax, used.hp)}</li>
		<li class="ap"><span title="attack points">AP:</span> ${getPoolHtml('ap', hero.ap, hero.apMax, used.ap)}</li>
		<li class="bp"><span title="balance points">BP:</span> ${getPoolHtml('bp', hero.bp, hero.bpMax, used.bp)}</li>
		<li class="ep"><span title="endurance points">EP:</span> ${getPoolHtml('ep', hero.ep, hero.epMax, used.ep)}</li>
		<li class="wp"><span title="willpower (spell) points">WP:</span> ${getPoolHtml('wp', hero.wp, hero.wpMax, used.wp)}</li>
		</ul>
		${deadHtml}
		<ul class="abilities">
		${getAbilityHtml(hero, 0)}
		${getAbilityHtml(hero, 1)}
		${getAbilityHtml(hero, 2)}
		${getAbilityHtml(hero, 3)}
		${getAbilityHtml(hero, 4)}
		${getAbilityHtml(hero, 5)}
		${getAbilityHtml(hero, 6)}
		${getAbilityHtml(hero, 7)}
		${getAbilityHtml(hero, 8)}
		</ul>
	`);
};

function drawDamage(isDamaged = false) {
	const displayElt = document.getElementById('display');
	if (isDamaged) {
		displayElt.classList.add('damaged');
	} else {
		displayElt.classList.remove('damaged');
	}		
};

function runGame() {
	const seed = rote.random.makeSeed();
	console.log('seed:', seed);

	// Connect to browser DOM for display
	g.createDisplay(displayOptions);
	g.display.drawInterface = drawInterface;
	g.display.drawDamage = drawDamage;
	// Build the game world
	g.createLevels(g.data.dungeon, seed);
	const bottomLevel = g.levels[g.levels.length - 1];
	setupMachinery(bottomLevel);
	const topLevel = g.levels[0];
	// Create pcs, npcs, items
	// rote.random.setSeed();
	createPlayerCharacter(topLevel);

	// "highlight" some parts of the town
	const sunstone = topLevel.items.find((item) => { return item.type === 'axe'; });
	topLevel.discoverCircle(sunstone.x, sunstone.y, 3);
	const stairs = topLevel.props.find((prop) => { return prop.type === 'stairsDown'; });
	topLevel.discoverCircle(stairs.x, stairs.y, 3);
	// Start the game
	// TODO: move these to a state transition to GAME
	setTimeout(() => {
		g.print(
			`After hitching rides across the void, you've finally found an abandoned ship that you
			can make into a home. Unfortunately its rune-drive is unpowered, but the teleporter is
			operational. Perhaps you can hitch a ride on some nearby ships and look for a Yendorian
			crystal to fully power the ship.`,
			'plot'
		);
	}, 1000);
	setTimeout(() => {
		g.print(
			`To win: Find the crystal, return to your ship, and install it in your rune-drive.`,
			'', 100
		);
	}, 2000);
	g.start();
}

g.ready(runGame);
