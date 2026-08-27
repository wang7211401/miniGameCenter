import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';

import Bullet from './components/Bullet';
import ExpGem from './components/ExpGem';
import VirtualJoystick from './components/VirtualJoystick';
import WeaponBar from './components/WeaponBar';

import useUserStore from '../../store/userSlice';
import { getRandomUpgrades, UPGRADE_TYPES } from './data/upgrades';
import { createWeapon, upgradeWeapon } from './data/weapons';
import {
  createInitialPlayer,
  getNextExp,
  levelUpPlayer,
} from './gameLogic';
import {
  calculateDamage,
  checkProjectileCollision,
  damageEnemy,
  getDistance,
  processEnemyDeath,
} from './systems/collisionSystem';
import {
  enemyHitsPlayer,
  spawnEnemyAroundPlayer,
  updateEnemies,
} from './systems/enemySystem';
import {
  fireProjectileWeapon,
  updateProjectile,
  updateWeaponCooldown,
} from './systems/weaponSystem';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } =
  Dimensions.get('window');

/**
 * ============================================================
 * 游戏尺寸
 * ============================================================
 *
 * 游戏区域使用屏幕宽度。
 *
 * 如果你的 HUD 高度比较大，可以适当减小 GAME_VIEW_HEIGHT。
 */
const GAME_VIEW_WIDTH = SCREEN_WIDTH;

const GAME_VIEW_HEIGHT = SCREEN_HEIGHT;


/**
 * 玩家尺寸
 */
const PLAYER_SIZE = 40;

/**
 * ============================================================
 * 工具函数
 * ============================================================
 */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatTime(seconds) {
  const total = Math.floor(seconds || 0);

  const minutes = Math.floor(total / 60);
  const secs = total % 60;

  return `${String(minutes).padStart(2, '0')}:${String(
    secs
  ).padStart(2, '0')}`;
}

/**
 * ============================================================
 * GameObject
 * ============================================================
 *
 * 所有世界对象最终都通过这个组件渲染。
 */
function GameObject({
  x,
  y,
  size = 30,
  children,
  style,
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.gameObject,
        {
          width: size,
          height: size,
          left: x,
          top: y,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * ============================================================
 * SurvivalGameScreen
 * ============================================================
 */
export default function SurvivalGameScreen() {
  /**
   * ==========================================================
   * 游戏状态
   * ==========================================================
   */

  const [running, setRunning] = useState(false);

  const [gameTime, setGameTime] = useState(0);

  const [levelUp, setLevelUp] = useState(false);

  /**
   * 玩家
   *
   * 注意：
   * 这里的 x/y 是【世界坐标】
   *
   * 不要把它们改成屏幕坐标。
   */
  const [player, setPlayer] = useState(createInitialPlayer);

  const playerRef = useRef(player);

  const [enemies, setEnemies] = useState([]);
  const enemiesRef = useRef(enemies);

  const [bullets, setBullets] = useState([]);
  const bulletsRef = useRef(bullets);

  const [gems, setGems] = useState([]);
  const gemsRef = useRef(gems);

  const [skills, setSkills] = useState([]);
  const recordSurvivalTime = useUserStore((state) => state.recordSurvivalTime);
  const survivalRecordedRef = useRef(false);

  /**
   * 摇杆
   */
  const joystickRef = useRef({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  useEffect(() => {
    enemiesRef.current = enemies;
  }, [enemies]);

  useEffect(() => {
    bulletsRef.current = bullets;
  }, [bullets]);

  useEffect(() => {
    gemsRef.current = gems;
  }, [gems]);

  /**
   * ==========================================================
   * 摄像机
   * ==========================================================
   *
   * 摄像机始终跟随玩家。
   *
   * cameraX / cameraY
   * 就是当前屏幕中心对应的世界坐标。
   */
  const cameraX = player.x;
  const cameraY = player.y;

  /**
   * ==========================================================
   * 世界坐标 -> 屏幕坐标
   * ==========================================================
   *
   * 核心公式：
   *
   * screenX =
   *   worldX
   *   - cameraX
   *   + screenCenterX
   *
   * screenY =
   *   worldY
   *   - cameraY
   *   + screenCenterY
   *
   * 这样玩家无论走到哪里，
   * 都会始终出现在屏幕中心。
   */
  const worldToScreen = (
    worldX,
    worldY,
    size = 0
  ) => {
    return {
      x:
        worldX -
        cameraX +
        GAME_VIEW_WIDTH / 2 -
        size / 2,

      y:
        worldY -
        cameraY +
        GAME_VIEW_HEIGHT / 2 -
        size / 2,
    };
  };

  /**
   * ==========================================================
   * 屏幕中心
   * ==========================================================
   */
  const playerScreenPosition = useMemo(() => {
    return {
      x: GAME_VIEW_WIDTH / 2 - PLAYER_SIZE / 2,

      y: GAME_VIEW_HEIGHT / 2 - PLAYER_SIZE / 2,
    };
  }, []);

  /**
   * ==========================================================
   * 摇杆
   * ==========================================================
   */
  const setJoystick = useCallback((x, y) => {
    joystickRef.current = {
      x,
      y,
    };
  }, []);

  /**
   * ==========================================================
   * 开始游戏
   * ==========================================================
   */
  const startGame = useCallback(() => {
    /**
     * 玩家从世界坐标 0,0 开始。
     *
     * 因为摄像机跟随玩家，
     * 所以玩家会直接显示在屏幕中心。
     */
    setPlayer(createInitialPlayer());

    setEnemies([]);
    setBullets([]);
    setGems([]);

    setGameTime(0);

    setLevelUp(false);

    setRunning(true);
    survivalRecordedRef.current = false;

    joystickRef.current = {
      x: 0,
      y: 0,
    };
  }, []);

  /**
   * ==========================================================
   * 重新开始
   * ==========================================================
   */
  const restart = useCallback(() => {
    startGame();
  }, [startGame]);

  /**
   * ==========================================================
   * 选择技能
   * ==========================================================
   */
  const chooseSkill = useCallback(
    (skill) => {
      setLevelUp(false);

      setPlayer((prev) => {
        const next = {
          ...prev,
        };

        if (skill.type === UPGRADE_TYPES.WEAPON) {
          const weaponIndex = next.weapons.findIndex(
            (weapon) => weapon.id === skill.weaponId
          );

          if (weaponIndex >= 0) {
            const upgraded = upgradeWeapon(next.weapons[weaponIndex]);
            if (upgraded.level <= upgraded.maxLevel) {
              next.weapons = next.weapons.map((weapon, index) => (
                index === weaponIndex ? upgraded : weapon
              ));
            }
          } else {
            const weapon = createWeapon(skill.weaponId);
            if (weapon) next.weapons = [...next.weapons, weapon];
          }
        } else {
          switch (skill.id) {
            case 'upgrade-damage':
              next.damageMultiplier *= 1.15;
              break;
            case 'upgrade-speed':
              next.speed *= 1.15;
              break;
            case 'upgrade-hp':
              next.maxHp += 20;
              next.hp = Math.min(next.maxHp, next.hp + 20);
              break;
            case 'upgrade-magnet':
              next.magnetRange += 60;
              break;
            case 'upgrade-crit':
              next.critChance = Math.min(1, next.critChance + 0.05);
              break;
            default:
              break;
          }
        }

        return next;
      });
    },
    []
  );

  /**
   * ==========================================================
   * 游戏时间
   * ==========================================================
   */
  useEffect(() => {
    if (!running || levelUp) {
      return undefined;
    }

    const timer = setInterval(() => {
      setGameTime((time) => time + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [running, levelUp]);

  /**
   * ==========================================================
   * 玩家移动
   * ==========================================================
   *
   * 注意：
   *
   * 这里修改的是玩家世界坐标。
   *
   * 不要修改成：
   *
   * player.x = screenCenterX
   *
   * 摄像机系统会负责把玩家显示到屏幕中心。
   */
  useEffect(() => {
    if (!running || levelUp) return;

    let frameId;
    let lastTime = performance.now();

    const update = () => {
      const now = performance.now();
      const delta = Math.min(32, now - lastTime);
      lastTime = now;

      const joystick = joystickRef.current;
      const currentPlayer = playerRef.current;
      const dt = delta / 1000;
      let nextPlayer = {
        ...currentPlayer,
        x: currentPlayer.x + joystick.x * currentPlayer.speed * dt,
        y: currentPlayer.y + joystick.y * currentPlayer.speed * dt,
      };

      // ---- 1. 玩家移动 ----
      // 所有系统都使用同一个 nextPlayer，避免摄像机和世界对象错帧。

      // ---- 2. 敌人移动 ----
      let nextEnemies = enemiesRef.current
        .filter((enemy) => enemy.hp > 0)
        .map((enemy) => updateEnemies([enemy], nextPlayer, delta)[0]);

      // ---- 3. 武器发射与子弹碰撞 ----
      let nextBullets = bulletsRef.current
        .map((bullet) => updateProjectile(bullet, delta))
        .filter((bullet) => bullet.life > 0);
      let nextGems = gemsRef.current;
      const collectedGems = nextGems.filter(
        (gem) => getDistance(gem, nextPlayer) <= nextPlayer.magnetRange
      );
      nextGems = nextGems.filter(
        (gem) => getDistance(gem, nextPlayer) > nextPlayer.magnetRange
      );
      const nextWeapons = [];

      currentPlayer.weapons.forEach((weapon) => {
        const cooledWeapon = updateWeaponCooldown(weapon, delta);
        const result = fireProjectileWeapon({
          player: nextPlayer,
          enemies: nextEnemies,
          weapon: cooledWeapon,
        });

        nextWeapons.push(result.weapon);
        nextBullets = nextBullets.concat(result.projectiles);
      });

      const remainingBullets = [];
      nextBullets.forEach((bullet) => {
        const hitEnemy = checkProjectileCollision({
          projectile: bullet,
          enemies: nextEnemies,
        });

        if (!hitEnemy) {
          remainingBullets.push(bullet);
          return;
        }

        const damageInfo = calculateDamage({
          baseDamage: bullet.damage,
          critChance: bullet.critChance,
          critMultiplier: bullet.critMultiplier,
        });
        const result = damageEnemy(hitEnemy, damageInfo);
        nextEnemies = nextEnemies.map((enemy) => (
          enemy.id === hitEnemy.id ? result.enemy : enemy
        ));

        if (result.killed) {
          nextGems = [...nextGems, processEnemyDeath(result.enemy).gem];
        }

        const hitEnemies = [...(bullet.hitEnemies || []), hitEnemy.id];
        if (bullet.piercing > 0) {
          remainingBullets.push({
            ...bullet,
            piercing: bullet.piercing - 1,
            hitEnemies,
          });
        }
      });

      enemiesRef.current = nextEnemies;
      bulletsRef.current = remainingBullets;
      gemsRef.current = nextGems;
      setEnemies(nextEnemies);
      setBullets(remainingBullets);
      setGems(nextGems);

      nextPlayer.weapons = nextWeapons;

      if (collectedGems.length > 0) {
        nextPlayer.exp = nextPlayer.exp + collectedGems.reduce(
            (total, gem) => total + gem.value,
            0
          );
        let gainedLevel = false;

        while (nextPlayer.exp >= nextPlayer.expToNext) {
          nextPlayer = levelUpPlayer({
            ...nextPlayer,
            exp: nextPlayer.exp - nextPlayer.expToNext,
          });
          nextPlayer.expToNext = getNextExp(nextPlayer.level);
          gainedLevel = true;
        }

        if (gainedLevel) {
          setSkills(getRandomUpgrades(3));
          setLevelUp(true);
        }
      }

      // 敌人接触玩家时持续造成伤害，伤害按秒数换算，避免帧率影响结果。
      const contactDamage = nextEnemies.reduce((total, enemy) => {
        return enemyHitsPlayer(enemy, nextPlayer)
          ? total + (enemy.damage ?? 0) * (delta / 1000)
          : total;
      }, 0);

      if (contactDamage > 0) {
        nextPlayer.hp = Math.max(0, nextPlayer.hp - contactDamage);
      }

      playerRef.current = nextPlayer;
      setPlayer(nextPlayer);

      frameId = requestAnimationFrame(update);
    };

    frameId = requestAnimationFrame(update);

    return () => cancelAnimationFrame(frameId);
  }, [running, levelUp]); // 移除 player 依赖

  useEffect(() => {
    if (running && player.hp <= 0) {
      if (!survivalRecordedRef.current) {
        recordSurvivalTime(gameTime);
        survivalRecordedRef.current = true;
      }
      setRunning(false);
    }
  }, [gameTime, player.hp, recordSurvivalTime, running]);

  /**
   * ==========================================================
   * 示例敌人生成
   * ==========================================================
   *
   * 如果你的 enemySystem 已经负责生成敌人，
   * 可以删除这个 effect。
   */
  useEffect(() => {
    if (!running || levelUp) {
      return undefined;
    }

    const timer = setInterval(() => {
      setEnemies((prev) => {
        if (prev.length >= 25) {
          return prev;
        }

        return [
          ...prev,
          spawnEnemyAroundPlayer({
            player: playerRef.current,
            difficulty: 1,
            minDistance: 350,
            maxDistance: 650,
          }),
        ];
      });
    }, 800);

    return () => {
      clearInterval(timer);
    };
  }, [running, levelUp]);

  /**
   * ==========================================================
   * 注意：
   *
   * 上面的敌人生成如果你的项目已经有 enemySystem，
   * 不要使用这个 effect。
   *
   * 下面的代码只负责渲染。
   * ==========================================================
   */

  /**
   * ==========================================================
   * EXP
   * ==========================================================
   */
  const progress =
    player.expToNext > 0
      ? clamp(
        player.exp /
        player.expToNext,
        0,
        1
      )
      : 0;

  /**
   * ==========================================================
   * 开始菜单
   * ==========================================================
   */
  if (!running && gameTime === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.menu}>
          <Text style={styles.menuIcon}>
            ⚔️
          </Text>

          <Text style={styles.menuTitle}>
            割草生存
          </Text>

          <Text style={styles.menuSubTitle}>
            Survival Challenge
          </Text>

          <Text style={styles.menuDescription}>
            操控角色移动，自动攻击敌人
          </Text>

          <Text style={styles.menuDescription}>
            击败敌人获得经验，不断升级强化
          </Text>

          <Pressable
            style={styles.startButton}
            onPress={startGame}
          >
            <Text style={styles.startButtonText}>
              开始游戏
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  /**
   * ==========================================================
   * 游戏界面
   * ==========================================================
   */
  return (
    <View style={styles.container}>
      {/* ======================================================
          HUD
      ====================================================== */}

      <View style={styles.hudContainer}>
        <WeaponBar
          weapons={
            player.weapons || []
          }
        />

        <View style={styles.hud}>
          <View style={styles.levelBox}>
            <Text style={styles.level}>
              LV.{player.level}
            </Text>

            <View style={styles.expBar}>
              <View
                style={[
                  styles.expProgress,
                  {
                    width: `${progress * 100}%`,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.hpBox}>
            <Text style={styles.hpText}>
              ❤️{' '}
              {Math.ceil(
                player.hp
              )}
              /
              {player.maxHp}
            </Text>
          </View>

          <Text style={styles.time}>
            {formatTime(gameTime)}
          </Text>
        </View>
      </View>

      {/* ======================================================
          游戏世界
      ====================================================== */}

      <View
        style={[
          styles.game,
          {
            width: GAME_VIEW_WIDTH,
            height: GAME_VIEW_HEIGHT,
          },
        ]}
      >
        {/* ====================================================
            摇杆
        ==================================================== */}
        <VirtualJoystick
          onMove={setJoystick}
          onRelease={() =>
            setJoystick(0, 0)
          }
        />
        {/* ====================================================
            世界背景
        ==================================================== */}

        <View
          pointerEvents="none"
          style={[
            styles.worldBackground,
            {
              width:
                GAME_VIEW_WIDTH,
              height:
                GAME_VIEW_HEIGHT,
            },
          ]}
        >
          <Text style={styles.backgroundText}>
            {Math.floor(
              player.x / 100
            )}
            ,
            {Math.floor(
              player.y / 100
            )}
          </Text>
        </View>

        {/* ====================================================
            经验宝石
        ==================================================== */}

        {gems.map((gem) => {
          const position = worldToScreen(
            gem.x,
            gem.y,
            16
          );

          return <ExpGem key={gem.id} gem={{ ...position, id: gem.id }} />;
        })}

        {/* ====================================================
            子弹
        ==================================================== */}

        {bullets.map((bullet) => {
          const position = worldToScreen(
            bullet.x,
            bullet.y,
            10
          );

          return <Bullet key={bullet.id} bullet={{ ...bullet, ...position }} />;
        })}

        {/* ====================================================
            敌人
        ==================================================== */}

        {enemies.map((enemy) => {
          const size =
            enemy.type === 'tank'
              ? 42
              : 30;

          const position = worldToScreen(
            enemy.x,
            enemy.y,
            size
          );

          return (
            <GameObject
              key={enemy.id}
              x={position.x}
              y={position.y}
              size={size}
            >
              <Text style={styles.enemy}>
                {enemy.type === 'tank'
                  ? '👹'
                  : enemy.type === 'fast'
                    ? '🦇'
                    : '👾'}
              </Text>
            </GameObject>
          );
        })}

        {/* ====================================================
            玩家
        ====================================================
        
        ★★★ 核心 ★★★
        
        玩家永远不使用 player.x / player.y 渲染。
        
        玩家直接固定在游戏区域中心。
        */}

        <GameObject
          x={GAME_VIEW_WIDTH / 2 - PLAYER_SIZE / 2}
          y={GAME_VIEW_HEIGHT / 2 - PLAYER_SIZE / 2}
          size={PLAYER_SIZE}
          style={
            styles.playerObject
          }
        >
          <Text
            style={styles.player}
          >
            🧙
          </Text>
        </GameObject>


      </View>

      {/* ======================================================
          升级界面
      ====================================================== */}

      {levelUp && (
        <View style={styles.overlay}>
          <Text
            style={styles.levelUpTitle}
          >
            🎉 升级！
          </Text>

          <Text
            style={styles.levelUpSub}
          >
            选择一个强化
          </Text>

          <View
            style={styles.skillList}
          >
            {skills.map(
              (skill) => (
                <Pressable
                  key={skill.id}
                  style={
                    styles.skillCard
                  }
                  onPress={() =>
                    chooseSkill(
                      skill
                    )
                  }
                >
                  <Text
                    style={
                      styles.skillIcon
                    }
                  >
                    {skill.icon}
                  </Text>

                  <Text
                    style={
                      styles.skillName
                    }
                  >
                    {skill.name}
                  </Text>

                  <Text
                    style={
                      styles.skillDescription
                    }
                  >
                    {
                      skill.description
                    }
                  </Text>
                </Pressable>
              )
            )}
          </View>
        </View>
      )}

      {/* ======================================================
          游戏结束
      ====================================================== */}

      {!running &&
        gameTime > 0 &&
        !levelUp &&
        player.hp <= 0 && (
          <View
            style={styles.overlay}
          >
            <Text
              style={
                styles.gameOver
              }
            >
              💀 游戏结束
            </Text>

            <Text
              style={styles.result}
            >
              生存时间：
              {formatTime(
                gameTime
              )}
            </Text>

            <Text
              style={styles.result}
            >
              等级：
              {player.level}
            </Text>

            <Pressable
              style={
                styles.restart
              }
              onPress={restart}
            >
              <Text
                style={
                  styles.restartText
                }
              >
                重新开始
              </Text>
            </Pressable>
          </View>
        )}
    </View>
  );
}

/**
 * ============================================================
 * Styles
 * ============================================================
 */

const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor:'#101820',
  },

  /**
   * ==========================================================
   * 开始菜单
   * ==========================================================
   */

  menu: {
    flex: 1,

    alignItems: 'center',

    justifyContent:
      'center',

    padding: 30,
  },

  menuIcon: {
    fontSize: 72,

    marginBottom: 10,
  },

  menuTitle: {
    fontSize: 36,

    fontWeight: '900',

    color: '#fff',

    marginBottom: 4,
  },

  menuSubTitle: {
    fontSize: 16,

    color: '#aaa',

    marginBottom: 30,
  },

  menuDescription: {
    color: '#ccc',

    fontSize: 15,

    marginBottom: 8,
  },

  startButton: {
    marginTop: 35,

    width: 220,

    height: 58,

    borderRadius: 30,

    backgroundColor:
      '#ff6b35',

    alignItems: 'center',

    justifyContent:
      'center',

    elevation: 5,
  },

  startButtonText: {
    color: '#fff',

    fontSize: 20,

    fontWeight: 'bold',
  },

  /**
   * ==========================================================
   * HUD
   * ==========================================================
   */

  hudContainer: {
    position: 'absolute',

    top: 0,

    left: 0,

    right: 0,

    zIndex: 100,
  },

  hud: {
    position: 'absolute',

    top: 0,

    left: 0,

    right: 0,

    zIndex: 1000,
    height: 64,

    paddingHorizontal: 12,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',

    backgroundColor:
      'rgba(0,0,0,0.45)',
  },

  levelBox: {
    width: 130,
  },

  level: {
    color: '#fff',

    fontSize: 16,

    fontWeight: 'bold',

    marginBottom: 5,
  },

  expBar: {
    width: '100%',

    height: 7,

    borderRadius: 4,

    overflow: 'hidden',

    backgroundColor:
      'rgba(255,255,255,0.2)',
  },

  expProgress: {
    height: '100%',

    backgroundColor:
      '#45d9ff',
  },

  hpBox: {
    paddingHorizontal: 12,

    paddingVertical: 6,

    borderRadius: 15,

    backgroundColor:
      'rgba(0,0,0,0.35)',
  },

  hpText: {
    color: '#fff',

    fontSize: 14,

    fontWeight: 'bold',
  },

  time: {
    color: '#fff',

    fontSize: 16,

    fontWeight: 'bold',

    width: 60,

    textAlign: 'right',
  },

  /**
   * ==========================================================
   * 游戏区域
   * ==========================================================
   */

  game: {
    position: 'relative',
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#18261c',
  },

  worldBackground: {
    position: 'absolute',

    left: 0,

    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor:
      '#18261c',
  },

  backgroundText: {
    position: 'absolute',

    right: 8,

    top: 75,

    color:
      'rgba(255,255,255,0.15)',

    fontSize: 10,
  },

  /**
   * ==========================================================
   * GameObject
   * ==========================================================
   */

  gameObject: {
    position: 'absolute',

    alignItems: 'center',

    justifyContent: 'center',
  },

  /**
   * ==========================================================
   * 玩家
   * ==========================================================
   */

  playerObject: {
    zIndex: 50,
  },

  player: {
    fontSize: 36,

    textAlign: 'center',
  },

  /**
   * ==========================================================
   * 敌人
   * ==========================================================
   */

  enemy: {
    fontSize: 28,

    textAlign: 'center',
  },

  tankEnemy: {
    fontSize: 40,
  },

  fastEnemy: {
    fontSize: 28,
  },

  /**
   * ==========================================================
   * 宝石
   * ==========================================================
   */

  gem: {
    fontSize: 16,
  },

  /**
   * ==========================================================
   * 子弹
   * ==========================================================
   */

  bullet: {
    width: 8,

    height: 8,

    borderRadius: 4,

    backgroundColor:
      '#fff',

    shadowOpacity: 0.8,

    shadowRadius: 5,
  },

  fireBullet: {
    backgroundColor:
      '#ff6b35',
  },

  lightningBullet: {
    backgroundColor:
      '#ffe600',
  },

  knifeBullet: {
    width: 4,

    height: 14,

    borderRadius: 2,

    backgroundColor:
      '#ddd',
  },

  bombBullet: {
    width: 12,

    height: 12,

    borderRadius: 6,

    backgroundColor:
      '#333',
  },

  /**
   * ==========================================================
   * 升级 / 游戏结束
   * ==========================================================
   */

  overlay: {
    position: 'absolute',

    left: 0,

    top: 0,

    right: 0,

    bottom: 0,

    zIndex: 2000,

    alignItems: 'center',

    justifyContent:
      'center',

    padding: 20,

    backgroundColor:
      'rgba(0,0,0,0.78)',
  },

  levelUpTitle: {
    color: '#fff',

    fontSize: 32,

    fontWeight: '900',

    marginBottom: 8,
  },

  levelUpSub: {
    color: '#ccc',

    fontSize: 16,

    marginBottom: 20,
  },

  skillList: {
    width: '100%',

    maxWidth: 500,

    gap: 12,
  },

  skillCard: {
    width: '100%',

    minHeight: 80,

    padding: 14,

    borderRadius: 14,

    backgroundColor:
      '#273444',

    flexDirection: 'row',

    alignItems: 'center',
  },

  skillIcon: {
    fontSize: 32,

    width: 50,

    textAlign: 'center',
  },

  skillName: {
    color: '#fff',

    fontSize: 17,

    fontWeight: 'bold',

    marginBottom: 3,
  },

  skillDescription: {
    color: '#bbb',

    fontSize: 13,
  },

  gameOver: {
    color: '#fff',

    fontSize: 34,

    fontWeight: '900',

    marginBottom: 20,
  },

  result: {
    color: '#ddd',

    fontSize: 17,

    marginBottom: 8,
  },

  restart: {
    marginTop: 25,

    paddingHorizontal: 45,

    paddingVertical: 14,

    borderRadius: 25,

    backgroundColor:
      '#ff6b35',
  },

  restartText: {
    color: '#fff',

    fontSize: 18,

    fontWeight: 'bold',
  },
});