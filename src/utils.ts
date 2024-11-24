import * as THREE from 'three';

export const TL = new THREE.TextureLoader();

export const CARD_WIDTH = 655;
export const CARD_HEIGHT = 930;
export const TEXTURE_CARD_BACK = TL.load('/images/card_back.png');
export const TEXTURE_TRANSPARENT = TL.load('/images/transparent.png');

export const MATERIAL_TRANSPARENT = new THREE.MeshBasicMaterial({ map: TEXTURE_TRANSPARENT, transparent: true })

const ratio = CARD_WIDTH / CARD_HEIGHT;
const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', 'J', 'Q', 'K'];
const SCALE = .075;

export function getCardValue(display: string): number {
    if (display === 'A') return 1;
    else if (['J', 'Q', 'K'].indexOf(display) != -1) return .5;
  
    return parseInt(display);
}

export async function constructCards(): Promise<THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial[], THREE.Object3DEventMap>[]> {
    return new Promise(resolve => {
        const geom = new THREE.BoxGeometry(ratio, 1, .001);

        const list: Array<THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial[], THREE.Object3DEventMap>> = [];

        SUITS.forEach(suit => {
            VALUES.forEach(value => {
                TL.load(`/images/${suit}/${value}.png`, texture => {
                    const mats = _mats(texture);
            
                    const card = new THREE.Mesh(geom, mats);
                    card.name = `${suit}-${value}`;
                    card.scale.set(SCALE, SCALE, 1);
            
                    card.userData = {
                        isCard: true,
                        type: suit,
                        display: value,
                        value: getCardValue(value),
                        used: false
                    };
            
                    list.push(card);
            
                    if (list.length === 40) resolve(list);
                }, undefined, error => console.error(error));
            });
        });
    });
}

function _mats(texture: THREE.Texture) {
    return [
        MATERIAL_TRANSPARENT,
        MATERIAL_TRANSPARENT,
        MATERIAL_TRANSPARENT,
        MATERIAL_TRANSPARENT,
        new THREE.MeshBasicMaterial({ name: 'front', map: texture, transparent: true }),
        new THREE.MeshBasicMaterial({ name: 'back', map: TEXTURE_CARD_BACK, transparent: true }),
    ]
}

const targets_defaults = {
    player: {
        x: -.3,
        z: -.06
    },
    dealer: {
        x: .05,
        z: -.06
    }
}

const targets = {
    player: new THREE.Vector3(targets_defaults.player.x, .0011, targets_defaults.player.z),
    dealer: new THREE.Vector3(targets_defaults.dealer.x, .0011, targets_defaults.dealer.z)
}

const current = {
    player: {
        x: targets_defaults.player.x,
        z: targets_defaults.player.z
    },
    dealer: {
        x: targets_defaults.dealer.x,
        z: targets_defaults.dealer.z
    }
}

export function getPointsFromCard(turn: 'player' | 'dealer', card: THREE.Mesh<any, THREE.MeshBasicMaterial[], THREE.Object3DEventMap>): Array<THREE.Vector3> {
    const {x, y, z} = card.position;

    return [
        new THREE.Vector3(x, y, z),
        new THREE.Vector3(x - ratio * SCALE, y, z),
        new THREE.Vector3(x - .1, y + .035, z),
        turn === 'player' ? targets.player.clone() : targets.dealer.clone()
    ];
}

export function updateNextTargetPos(turn: 'player' | 'dealer', totalCards: number) {
    if (totalCards % 4 === 0) {
        if (turn === 'player') {
            current.player.z += CARD_HEIGHT / 10000;
            targets.player.set(current.player.x, .0011, current.player.z);
        } else {
            current.dealer.z += CARD_HEIGHT / 10000;
            targets.dealer.set(current.dealer.x, .0011, current.dealer.z);
        }
    } else {
        if (turn === 'player') targets.player.add(new THREE.Vector3((CARD_WIDTH / CARD_HEIGHT * SCALE) + .01, 0, 0));
        else targets.dealer.add(new THREE.Vector3((CARD_WIDTH / CARD_HEIGHT * SCALE) + .01, 0, 0));
    }
}

export function resetTargetPosition() {
    current.player = {
        x: targets_defaults.player.x,
        z: targets_defaults.player.z
    }

    current.dealer = {
        x: targets_defaults.dealer.x,
        z: targets_defaults.dealer.z
    }
    targets.player.set(targets_defaults.player.x, .0011, targets_defaults.player.z);
    targets.dealer.set(targets_defaults.dealer.x, .0011, targets_defaults.dealer.z);
}