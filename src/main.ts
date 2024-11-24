import * as THREE from 'three';
import { WebGL, OrbitControls } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { IConfig, IElements } from './interfaces';
import * as utils from './utils';

if (!WebGL.isWebGL2Available()) {
	document.getElementById( 'container' )?.appendChild(WebGL.getWebGL2ErrorMessage());
  throw new Error('WebGL is not supported!')
}

// JQuery like selector
const $ = (selector: string) => document.querySelector(selector);

const {
  TextureLoader,
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  BoxGeometry,
  Vector2,
  Vector3,
  Raycaster,
  CatmullRomCurve3
} = THREE;

// MAIN VARIABLES
const WIN_SCORE = 7.5;
const DEALER_MAX_SCORE = 6;

const config: IConfig = {
  player: {
    name: '',
    money: 0,
    score: 0,
    updateName: () => {
      elements.playerName.innerText = config.player.name!;
    },
    updateMoney: () => {
      elements.playerMoney.innerText = `${config.player.money} €`;
    },
    updateScore: () => {
      elements.playerScore.innerText = `${config.player.score} pts`;
    },
    cardsAmount: 0
  },
  dealer: {
    score: 0,
    updateScore: () => {
      elements.dealerScore.innerText = `${config.dealer.score} pts`;
    },
    cardsAmount: 0
  },
  animation: {
    animate: false,
    selectedCard: null!,
    path: null!,
    points: [],
    startTime: null,
    line: null!
  },
  cards: [],
  canSelectNextCard: false,
  bet: 0,
  turn: 'player'
}

const elements: IElements = {
  playerName: $('div#player-data>span:nth-child(1)') as HTMLSpanElement,
  playerMoney: $('div#player-data>span:nth-child(2)') as HTMLSpanElement,
  playerScore: $('div#player-data>span:nth-child(3)') as HTMLSpanElement,
  dealerScore: $('div#dealer-data>span:nth-child(2)') as HTMLSpanElement,
}

const mousePos = new Vector2();
const raycaster = new Raycaster();

// START
const stats = new Stats();
const $stats = document.createElement('div');
$stats.id = 'stats-container';
$stats.append(stats.dom);
document.body.append($stats);

const scene = new Scene();
scene.background = utils.TL.load('/images/space.jpg');

// LOADERS.gltf.load('src/models/tableRound.glb', gltf => {
//   console.log('loaded the table')
//   scene.add(gltf.scene);
// }, undefined, err => console.error(err));

const camera = new PerspectiveCamera(90, window.innerWidth / window.innerHeight, .1, 1000);
camera.position.set(0, .4, .4);

(window as any).camera = camera;

const renderer = new WebGLRenderer({ antialias: true });

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);

document.body.appendChild( renderer.domElement );

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = true;

// DEBUG
const material = new THREE.LineBasicMaterial( { color: 0x0000ff } );
const points = [
  new Vector3( 0, 0, 0 ),
  new Vector3( 0, 10, 0 )
];
const geometry = new THREE.BufferGeometry().setFromPoints( points );
scene.add( new THREE.Line( geometry, material ) );

const plane = new THREE.Mesh(
  new THREE.PlaneGeometry(.7, .25),
  new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide })
);
plane.rotateX(MathUtils.degToRad(90))
scene.add(plane);

const card = new THREE.Mesh(new THREE.BoxGeometry(655 / 930, 1, .001), new THREE.MeshBasicMaterial({ color: 0xff00ff }));
(window as any).card = card;
// scene.add(card);
// -.3  + (655 / 930 * .075) + .01
card.position.set(-.3, .0011, -.06)
card.scale.set(.075, .075, 1);
card.rotateX(MathUtils.degToRad(90))

const card2 = card.clone();
card2.position.set(-.3, .0011, -.06 + 930 / 10000)

// scene.add(card2)

// ELEMENTS & EVENTS
const $intro = $('div#game-intro') as HTMLDivElement;
const $btnEnter = $('button#btn-enter') as HTMLButtonElement;
const $playerInfo = $('dialog#player-information') as HTMLDialogElement;
const $btnPlay = $('button#btn-play') as HTMLButtonElement;
const $btnStartRound = $('button#btn-start-round') as HTMLButtonElement;
const $betContainer = $('div#bet-container') as HTMLDivElement;
const $btnBet = $('button#btn-bet') as HTMLButtonElement;
const $btnEndTurn = $('button#btn-end-player-turn') as HTMLButtonElement;

$btnEnter.addEventListener('click', () => {
  $intro.classList.add('close');

  setTimeout(() => {
    $intro.remove();

    $playerInfo.open = true;

    setupCards();
  }, 550); // opacity animation + 50ms
});

$btnPlay.addEventListener('click', () => {
  config.player.name = ($('input#player_name') as HTMLInputElement).value;
  config.player.money = ($('input#money') as HTMLInputElement).valueAsNumber;

  if (!config.player.name || !config.player.money) return;

  config.player.updateName!();
  config.player.updateMoney!();

  $('div#game-values')?.classList.add('show');

  $playerInfo.open = false;
});

$btnStartRound.addEventListener('click', () => {
  $btnStartRound.disabled = true;

  $betContainer.classList.add('show');
});

$btnBet.addEventListener('click', () => {
  config.bet = ($('input#bet-amount') as HTMLInputElement).valueAsNumber;

  if (config.player.money! < config.bet) {
    console.error('You dont have enough money')

    return;
  }

  $betContainer.classList.remove('show');

  config.player.money! -= config.bet;

  config.player.updateMoney!();

  $btnEndTurn.disabled = false;

  giveCard('player');
});

$btnEndTurn.addEventListener('click', () => {
  config.turn = 'dealer';

  $btnEndTurn.disabled = true;
  
  giveCard('dealer');
});

document.addEventListener('click', event => {
  if (!config.canSelectNextCard) return;
  
  mousePos.x = (event.clientX / window.innerWidth) * 2 - 1;
  mousePos.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mousePos, camera);
  const intersects = raycaster.intersectObjects(scene.children, false);

  if (intersects.length > 0) {
    if (intersects.some(obj => obj.object.userData.isCard)) giveCard('player');
  }
});

// END SETUP

// GAMEPLAY FUNCTIONS
async function setupCards() {
  console.time('construct cards');
  config.cards = await utils.constructCards().catch(err => {
    console.error(err);

    return [];
  });
  console.timeEnd('construct cards');

  let lastY = .0011;

  config.cards.forEach(card => {
    card.position.set(.3, lastY, -.075)
    card.rotateX(MathUtils.degToRad(90));

    scene.add(card);

    lastY += .0011;
  });
}

function animate(time: number) {
  controls.update();
  stats.update();

  shouldAnimateCard(time);

  renderer.render(scene, camera);
}

function shouldAnimateCard(time: number) {
  if (config.animation.animate) {
    if (config.animation.startTime == null) config.animation.startTime = time;
    const p = config.animation.points.length + 1;
    const t = ((time - config.animation.startTime) / 500  % p) / p;
    const position = config.animation.path.getPointAt(t);
    config.animation.selectedCard.position.copy(position);
    if (t > .99) {
      config.animation.animate = false;

      config.animation.selectedCard.rotateY(MathUtils.degToRad(180));

      const { value } = config.animation.selectedCard.userData;

      if (config.turn === 'player') {
        config.player.score += value;
        config.player.updateScore();
      } else {
        config.dealer.score += value;
        config.dealer.updateScore();
      }

      if (config.animation.line) scene.remove(config.animation.line);
      
      config.animation = {
        animate: false,
        line: null!,
        path: null!,
        points: null!,
        selectedCard: null!,
        startTime: null
      }

      config.canSelectNextCard = true;

      setTimeout(() => {
        if (config.turn === 'player') {
          if (config.player.score === WIN_SCORE) win();
        } else {
          console.log('checking result')
  
          if (config.dealer.score >= config.player.score) win();
          else if (config.dealer.score > WIN_SCORE) lose();
          else if (config.dealer.score < DEALER_MAX_SCORE) giveCard('dealer');
        }
      }, 500);
    }
  }
}

function lose() {
  alert('You lost!')

  reset();
}

function reset() {
  config.canSelectNextCard = false;

  config.cards.forEach(card => scene.remove(card));

  $btnEndTurn.disabled = true;
  $btnStartRound.disabled = false;

  config.player.score = 0;
  config.player.updateScore();
  config.dealer.score = 0;
  config.dealer.updateScore();

  config.player.cardsAmount = 0;
  config.dealer.cardsAmount = 0;

  config.turn = 'player';

  utils.resetTargetPosition();

  setupCards();
}

function win() {
  alert('YOU WON!')

  config.player.money! += config.bet * 2;
  config.player.updateMoney!();

  reset();
}

function giveCard(turn: 'player' | 'dealer') {
  if (turn === 'player') {
    config.canSelectNextCard = false;

    config.player.cardsAmount++;
  } else config.dealer.cardsAmount++;

  const card = getRandomCard();
  card.userData.used = true;

  const points = utils.getPointsFromCard(turn, card);

  const path = new CatmullRomCurve3(points);

  const geom = new THREE.BufferGeometry().setFromPoints(path.getPoints(75));
  const mat = new THREE.LineBasicMaterial({ color: 0xff000000, transparent: true });
  const line = new THREE.Line(geom, mat);

  scene.add(line);

  config.animation.animate = true;
  config.animation.selectedCard = card;
  config.animation.path = path;
  config.animation.points = points;
  config.animation.line = line;

  utils.updateNextTargetPos(turn, turn === 'player' ? config.player.cardsAmount : config.dealer.cardsAmount);
}

function getRandomCard() {
  let pos = Math.floor(Math.random() * config.cards.length);

  let card = config.cards[pos];

  while (card.userData.used) {
    pos = Math.floor(Math.random() * config.cards.length);
  
    card = config.cards[pos];
  }

  return card;
}

function onDealerEnd() {}