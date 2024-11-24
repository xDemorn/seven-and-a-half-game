import * as THREE from 'three';

export interface IConfig {
    player: IPlayer;
    dealer: IPlayer;
    animation: IAnimation;
    cards: Array<THREE.Mesh<any, THREE.MeshBasicMaterial[], THREE.Object3DEventMap>>;
    canSelectNextCard: boolean;
    bet: number;
    turn: 'player' | 'dealer';
}

export interface IAnimation {
    animate: boolean;
    selectedCard: THREE.Mesh<any, THREE.MeshBasicMaterial[], THREE.Object3DEventMap>;
    path: THREE.CatmullRomCurve3;
    points: Array<THREE.Vector3>;
    startTime: number | null;
    line: THREE.Line<THREE.BufferGeometry<THREE.NormalBufferAttributes>, THREE.LineBasicMaterial, THREE.Object3DEventMap>;
}

export interface IPlayer {
    name?: string;
    money?: number;
    score: number;
    cardsAmount: number;
    updateName?: () => void;
    updateMoney?: () => void;
    updateScore: () => void;
}

export interface IElements {
    playerName: HTMLSpanElement,
    playerMoney: HTMLSpanElement,
    playerScore: HTMLSpanElement,
    dealerScore: HTMLSpanElement,
}