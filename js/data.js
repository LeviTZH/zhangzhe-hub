/* ============================================================
   张哲主题网站 — 云数据层 (知晓云 BaaS)
   云端优先 · localStorage 缓存 · 离线兼容
   ============================================================ */

// ===== 配置 =====
const BAAS_CLIENT_ID = '0e170dcd81502bc669af'; // 知晓云 ClientID
let _baasReady = false;
let _baasUser = null;

// ===== 初始化知晓云 + 匿名登录 =====
async function initBaaS() {
  if (_baasReady) return true;
  if (typeof BaaS === 'undefined') {
    console.warn('[BaaS] SDK 未加载，仅使用本地存储');
    return false;
  }
  try {
    BaaS.init(BAAS_CLIENT_ID);
    // 匿名登录
    const user = await BaaS.auth.anonymousLogin();
    _baasUser = user;
    _baasReady = true;
    console.log('[BaaS] 匿名登录成功', user.id);
    return true;
  } catch (e) {
    console.warn('[BaaS] 初始化失败，降级为本地存储:', e.message);
    return false;
  }
}

// ===== 通用：云端读（TableObject query）=====
async function baasQuery(tableName, orderKey = 'created_at', orderType = 'desc', limit = 100) {
  await initBaaS();
  if (!_baasReady) return null;
  try {
    const query = new BaaS.Query(tableName);
    query.orderBy(orderKey, orderType === 'desc' ? 'desc' : 'asc');
    query.limit(limit);
    const res = await query.find();
    return res.data.objects || [];
  } catch (e) {
    console.warn(`[BaaS] 查询 ${tableName} 失败:`, e.message);
    return null;
  }
}

// ===== 通用：云端写（TableObject create）=====
async function baasCreate(tableName, record) {
  await initBaaS();
  if (!_baasReady) return null;
  try {
    const Table = new BaaS.TableObject(tableName);
    const res = await Table.create(record);
    return res.data || null;
  } catch (e) {
    console.warn(`[BaaS] 写入 ${tableName} 失败:`, e.message);
    return null;
  }
}

// ===== 通用：云端更新（TableObject update）=====
async function baasUpdate(tableName, recordId, record) {
  await initBaaS();
  if (!_baasReady) return null;
  try {
    const Table = new BaaS.TableObject(tableName);
    const res = await Table.update(recordId, record);
    return res.data || null;
  } catch (e) {
    console.warn(`[BaaS] 更新 ${tableName}:${recordId} 失败:`, e.message);
    return null;
  }
}

// ===== 通用：云端删除 =====
async function baasDelete(tableName, recordId) {
  await initBaaS();
  if (!_baasReady) return false;
  try {
    const Table = new BaaS.TableObject(tableName);
    await Table.delete(recordId);
    return true;
  } catch (e) {
    console.warn(`[BaaS] 删除 ${tableName}:${recordId} 失败:`, e.message);
    return false;
  }
}

// ============================================================
// 业务接口 — 张哲档案（ZZProfile，云端单例）
// ============================================================

/**
 * 从云端加载张哲档案（zz_profile 表，id=1 为唯一记录）
 * 云端不可用则 fallback 到 localStorage 缓存
 */
async function zzLoadCloud() {
  await initBaaS();
  let local = zzLoad(); // localStorage 缓存

  if (_baasReady) {
    try {
      const query = new BaaS.Query('zz_profile');
      query.limit(1);
      const res = await query.find();
      if (res.data.objects && res.data.objects.length > 0) {
        const cloud = res.data.objects[0];
        // 用云端数据覆盖 localStorage（去掉系统字段）
        const clean = { ...cloud };
        delete clean._id; delete clean.id; delete clean.created_at; delete clean.updated_at;
        zzSave(clean);
        console.log('[BaaS] zz_profile 云端加载成功');
        return cloud;
      }
    } catch (e) {
      console.warn('[BaaS] zz_profile 云端读取失败，使用本地缓存:', e.message);
    }
  }
  return local;
}

/**
 * 保存张哲档案到云端（upsert：存在则更新，不存在则创建）
 */
async function zzSaveCloud(profile) {
  await initBaaS();
  zzSave(profile); // 永远写本地缓存

  if (!_baasReady) return false;

  try {
    const query = new BaaS.Query('zz_profile');
    query.limit(1);
    const res = await query.find();

    // 去掉系统字段，避免写入时报错
    const record = { ...profile };
    delete record._id; delete record.id;
    delete record.created_at; delete record.updated_at;

    if (res.data.objects && res.data.objects.length > 0) {
      // 更新第一条记录
      const objId = res.data.objects[0].id; // 知晓云数字 id
      const Table = new BaaS.TableObject('zz_profile');
      await Table.update(objId, record);
    } else {
      // 创建新记录
      const Table = new BaaS.TableObject('zz_profile');
      await Table.create(record);
    }
    console.log('[BaaS] zz_profile 云端保存成功');
    return true;
  } catch (e) {
    console.warn('[BaaS] zz_profile 云端保存失败:', e.message);
    return false;
  }
}

// ============================================================
// 业务接口 — 留言墙（zz_wall 表）
// ============================================================

async function wallLoadMessages() {
  const local = JSON.parse(localStorage.getItem('zz_wall') || '[]');

  await initBaaS();
  if (!_baasReady) return local;

  const cloud = await baasQuery('zz_wall', 'created_at', 'desc', 200);
  if (cloud) {
    localStorage.setItem('zz_wall', JSON.stringify(cloud));
    return cloud;
  }
  return local;
}

async function wallAddMessage(msg) {
  const local = JSON.parse(localStorage.getItem('zz_wall') || '[]');
  const newMsg = { ...msg, _local_id: Date.now() };
  local.unshift(newMsg);
  localStorage.setItem('zz_wall', JSON.stringify(local));

  await initBaaS();
  if (!_baasReady) return newMsg;

  const created = await baasCreate('zz_wall', msg);
  if (created) {
    // 替换本地缓存中的临时记录
    const idx = local.findIndex(m => m._local_id === newMsg._local_id);
    if (idx !== -1) { local[idx] = { ...msg, _id: created._id }; }
    localStorage.setItem('zz_wall', JSON.stringify(local));
    return created;
  }
  return newMsg;
}

async function wallDeleteMessage(messageId) {
  await initBaaS();
  if (_baasReady) {
    await baasDelete('zz_wall', messageId);
  }
  // 本地也删
  const local = JSON.parse(localStorage.getItem('zz_wall') || '[]');
  const filtered = local.filter(m => m._id !== messageId && m.id !== messageId);
  localStorage.setItem('zz_wall', JSON.stringify(filtered));
}

// ============================================================
// 业务接口 — 答题排行榜（zz_quiz_rank 表）
// ============================================================

async function quizLoadRanks() {
  const local = JSON.parse(localStorage.getItem('zz_quiz_rank') || '[]');

  await initBaaS();
  if (!_baasReady) return local;

  const cloud = await baasQuery('zz_quiz_rank', 'score', 'desc', 50);
  if (cloud) {
    localStorage.setItem('zz_quiz_rank', JSON.stringify(cloud));
    return cloud;
  }
  return local;
}

async function quizAddRank(record) {
  const local = JSON.parse(localStorage.getItem('zz_quiz_rank') || '[]');
  local.unshift(record);
  localStorage.setItem('zz_quiz_rank', JSON.stringify(local));

  await initBaaS();
  if (!_baasReady) return record;

  const created = await baasCreate('zz_quiz_rank', record);
  return created || record;
}

// ============================================================
// 业务接口 — 问卷提交（zz_survey 表）
// ============================================================

async function surveySubmit(data) {
  await initBaaS();
  if (!_baasReady) {
    // 离线模式：存 localStorage
    const local = JSON.parse(localStorage.getItem('zz_surveys') || '[]');
    local.push(data);
    localStorage.setItem('zz_surveys', JSON.stringify(local));
    return { offline: true };
  }

  const created = await baasCreate('zz_survey', data);
  return created;
}

// ============================================================
// 业务接口 — 问卷加载（zz_survey 表，最新一条）
// ============================================================

async function surveyLoad() {
  await initBaaS();
  if (!_baasReady) return null;
  try {
    const query = new BaaS.Query('zz_survey');
    query.orderBy('created_at', 'desc');
    query.limit(1);
    const res = await query.find();
    if (res.data.objects && res.data.objects.length > 0) {
      return res.data.objects[0];
    }
    return null;
  } catch (e) {
    console.warn('[BaaS] 问卷加载失败:', e.message);
    return null;
  }
}

// ============================================================
// 初始化：页面加载时自动初始化 BaaS（静默，不阻塞）
// ============================================================
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    initBaaS().then(ok => {
      if (ok) document.body.classList.add('baas-ready');
    });
  });
}
