import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- 定数 ---
const FIELD_WIDTH = 9;
const FIELD_HEIGHT = 20;
const FIELD_DEPTH = 3;

// --- シーン設定 ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

// --- カメラ設定 ---
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(FIELD_WIDTH, FIELD_HEIGHT, FIELD_DEPTH * 4);
camera.lookAt(0, 0, 0);

// --- レンダラー設定 ---
const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#game-canvas') as HTMLCanvasElement,
  antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);

// --- カメラコントロール ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- ライト設定 ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
directionalLight.position.set(10, 15, 5);
scene.add(directionalLight);

// --- ゲームフィールド作成 ---
const fieldGeometry = new THREE.BoxGeometry(FIELD_WIDTH, FIELD_HEIGHT, FIELD_DEPTH);
const wireframe = new THREE.EdgesGeometry(fieldGeometry);
const field = new THREE.LineSegments(wireframe);
field.material.color.set(0x333333);
field.position.set(0, 0, 0);
scene.add(field);

// --- 底面グリッドの作成 ---
const gridLines = [];
const gridMaterial = new THREE.LineBasicMaterial({ color: 0xcccccc });

const startX = -FIELD_WIDTH / 2;
const endX = FIELD_WIDTH / 2;
const startZ = -FIELD_DEPTH / 2;
const endZ = FIELD_DEPTH / 2;
const y = -FIELD_HEIGHT / 2;

// Z軸に平行な線
for (let i = 0; i <= FIELD_WIDTH; i++) {
    const x = startX + i;
    gridLines.push(new THREE.Vector3(x, y, startZ));
    gridLines.push(new THREE.Vector3(x, y, endZ));
}

// X軸に平行な線
for (let i = 0; i <= FIELD_DEPTH; i++) {
    const z = startZ + i;
    gridLines.push(new THREE.Vector3(startX, y, z));
    gridLines.push(new THREE.Vector3(endX, y, z));
}

const gridGeometry = new THREE.BufferGeometry().setFromPoints(gridLines);
const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
scene.add(grid);

// --- だんごピースの定義 ---
const DANGO_COLORS = [0xff8080, 0x80ff80, 0x8080ff, 0xffff80, 0xff80ff]; // 赤, 緑, 青, 黄, 紫
const dangoGeometry = new THREE.SphereGeometry(0.5, 16, 16); // 半径0.5の球体

function createDangoPiece() {
    const piece = new THREE.Group();
    const availableColors = [...DANGO_COLORS]; // 利用可能な色のリストをコピー

    for (let i = 0; i < 3; i++) {
        const randomIndex = Math.floor(Math.random() * availableColors.length);
        const color = availableColors[randomIndex];
        availableColors.splice(randomIndex, 1); // 選んだ色をリストから削除

        const dangoMaterial = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3 });
        const dango = new THREE.Mesh(dangoGeometry, dangoMaterial);
        dango.position.y = i - 1; // 3つのだんごを縦に並べる
        piece.add(dango);
    }
    return piece;
}

// --- 最初のピースを作成して配置 ---
const currentPiece = createDangoPiece();
currentPiece.position.set(0, FIELD_HEIGHT / 2 - 2, 0); // フィールド上部中央に配置
scene.add(currentPiece);

// --- UI要素の取得 ---
const guideXPlus = document.getElementById('guide-x-plus')!;
const guideXMinus = document.getElementById('guide-x-minus')!;
const guideZPlus = document.getElementById('guide-z-plus')!;
const guideZMinus = document.getElementById('guide-z-minus')!;

// --- ガイドの3D位置 ---
const guidePoints = {
    xPlus: new THREE.Vector3(FIELD_WIDTH / 2 + 1, 0, 0),
    xMinus: new THREE.Vector3(-FIELD_WIDTH / 2 - 1, 0, 0),
    zPlus: new THREE.Vector3(0, 0, FIELD_DEPTH / 2 + 1),
    zMinus: new THREE.Vector3(0, 0, -FIELD_DEPTH / 2 - 1),
};

document.addEventListener('keydown', (event) => {
    // 移動と回転で別々に処理
    handleMovement(event.key);
    handleRotation(event.key);
});

// --- 移動処理 ---
function handleMovement(key: string) {
    const dx = (key === 'ArrowLeft') ? -1 : (key === 'ArrowRight') ? 1 : 0;
    const dz = (key === 'ArrowUp') ? -1 : (key === 'ArrowDown') ? 1 : 0;

    if (dx === 0 && dz === 0) return;

    // 移動後の位置を仮計算
    currentPiece.position.x += dx;
    currentPiece.position.z += dz;

    // 移動後の位置がフィールド内かチェック
    if (!isPieceInsideField()) {
        // フィールド外なら元に戻す
        currentPiece.position.x -= dx;
        currentPiece.position.z -= dz;
    }
}

// --- 回転処理 ---
function handleRotation(key: string) {
    const axis = new THREE.Vector3();
    let angle = Math.PI / 2; // 90度

    switch (key.toLowerCase()) {
        case 'a': axis.set(0, 1, 0); break; // Y軸
        case 's': axis.set(0, 1, 0); angle = -angle; break;
        case 'z': axis.set(1, 0, 0); break; // X軸
        case 'x': axis.set(1, 0, 0); angle = -angle; break;
        case 'q': axis.set(0, 0, 1); break; // Z軸
        case 'w': axis.set(0, 0, 1); angle = -angle; break;
        default: return; // 回転キーでなければ終了
    }

    // 回転前の各だんごのローカル位置を保存
    const oldLocalPositions = currentPiece.children.map(dango => dango.position.clone());

    // 各だんごのローカル位置を回転させる
    for (const dango of currentPiece.children) {
        dango.position.applyAxisAngle(axis, angle);
        dango.position.round(); // 整数座標にスナップさせる
    }

    // 回転後に壁や床を突き抜けていないかチェック
    if (!isPieceInsideField()) {
        // 突き抜けていたら回転を元に戻す
        for (let i = 0; i < currentPiece.children.length; i++) {
            currentPiece.children[i].position.copy(oldLocalPositions[i]);
        }
    }
}

// --- グローバル座標でのだんごの位置を取得 ---
function getDangoWorldPositions(piece: THREE.Group): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    for (const dango of piece.children) {
        positions.push(dango.getWorldPosition(new THREE.Vector3()));
    }
    return positions;
}

// --- ピースがフィールド内にあるかチェック ---
function isPieceInsideField(): boolean {
    const halfWidth = FIELD_WIDTH / 2;
    const halfDepth = FIELD_DEPTH / 2;
    const halfHeight = FIELD_HEIGHT / 2;

    const worldPositions = getDangoWorldPositions(currentPiece);

    for (const pos of worldPositions) {
        // X軸方向のチェック
        if (pos.x < -halfWidth + 0.5 || pos.x > halfWidth - 0.5) {
            return false;
        }
        // Z軸方向のチェック
        if (pos.z < -halfDepth + 0.5 || pos.z > halfDepth - 0.5) {
            return false;
        }
        // Y軸方向のチェック (床より下)
        if (pos.y < -halfHeight + 0.5) {
            return false;
        }
    }
    return true;
}


// --- ウィンドウリサイズ対応 ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- アニメーションループ ---
function animate() {
  requestAnimationFrame(animate);
  controls.update(); // カメラコントロールを更新

  // 3Dポイントを2Dスクリーン座標に変換してUIを更新
  const points = [guidePoints.xPlus, guidePoints.xMinus, guidePoints.zPlus, guidePoints.zMinus];
  const guides = [guideXPlus, guideXMinus, guideZPlus, guideZMinus];

  for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const guide = guides[i];

      const screenPosition = point.clone().project(camera);
      const x = (screenPosition.x + 1) / 2 * window.innerWidth;
      const y = (-screenPosition.y + 1) / 2 * window.innerHeight;

      guide.style.left = `${x}px`;
      guide.style.top = `${y}px`;
  }

  renderer.render(scene, camera);
}

animate();
