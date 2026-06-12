/* ============================================================
   张哲主题网站 — 共享 JS
   导航 · 暗黑模式 · 数据存储 · 通用工具
   ============================================================ */

// ----- 数据存储：张哲全局档案 -----
const ZZ_STORE_KEY = 'zz_hub_data';

const ZZ_DEFAULTS = {
  name:'张哲',
  nickname:'哲哲',
  bio:'一个有趣的人，喜欢打游戏、吃辣、熬夜。',
  avatar:'🦊',
  birthday:'2000-01-01',
  memories:[
    { date:'2025-09-01', label:'第一次见面', emoji:'💫' },
    { date:'2025-12-25', label:'一起过圣诞', emoji:'🎄' }
  ],
  favorites:{
    games:['暗区突围','原神','王者荣耀'],
    foods:['火锅','麻辣烫','炸鸡'],
    songs:['晴天','起风了','夜曲'],
    colors:['红色','黑色']
  },
  quizQuestions:[
    { q:'张哲最喜欢的游戏是？', opts:['暗区突围','王者荣耀','原神','LOL'], ans:0 },
    { q:'张哲能多能吃辣？', opts:['微辣','中辣','特辣','无敌辣'], ans:3 },
    { q:'张哲一般几点睡？', opts:['10点','12点','凌晨2点','通宵'], ans:2 },
    { q:'张哲最喜欢的颜色？', opts:['蓝色','红色','黑色','白色'], ans:1 },
    { q:'张哲的爱好是？', opts:['看书','打游戏','跑步','做饭'], ans:1 },
    { q:'张哲最讨厌什么？', opts:['早起','熬夜','吃辣','打游戏'], ans:0 },
    { q:'张哲的星座是？', opts:['白羊','金牛','双子','巨蟹'], ans:0 },
    { q:'张哲喜欢的季节？', opts:['春天','夏天','秋天','冬天'], ans:3 },
    { q:'张哲喝奶茶加什么料？', opts:['珍珠','椰果','什么都不加','全加'], ans:0 },
    { q:'张哲觉得自己最帅的地方是？', opts:['眼睛','笑容','全部','不知道'], ans:2 }
  ],
  adventureScenes:[
    { id:'start', text:'又是一个平凡的下午，张哲在宿舍打游戏。突然手机响了...', choices:[
      { text:'接电话', next:'phone' },
      { text:'继续打游戏', next:'game' }
    ]},
    { id:'phone', text:'是朋友约他去吃火锅！张哲的肚子咕咕叫了起来...', choices:[
      { text:'立刻出发！', next:'hotpot_go' },
      { text:'"等我打完这局"', next:'game' }
    ]},
    { id:'game', text:'游戏打得太投入，不知不觉天都黑了。肚子好饿...', choices:[
      { text:'点外卖', next:'order' },
      { text:'出去觅食', next:'walk' }
    ]},
    { id:'hotpot_go', text:'火锅店里热气腾腾，张哲吃得满头大汗，太爽了！', ending:'happy', emoji:'🍲' },
    { id:'order', text:'外卖到了，但是送错了——是隔壁的奶茶！意外的惊喜。', ending:'lucky', emoji:'🧋' },
    { id:'walk', text:'出门遇到了一只超可爱的流浪猫，张哲蹲下来摸了半小时。', ending:'cozy', emoji:'🐱' }
  ],
  siteTitle:'张哲的世界',
  siteSubtitle:'探索关于张哲的一切',
  primaryColor:'#e8536c'
};

function zzLoad(){
  try {
    const raw = localStorage.getItem(ZZ_STORE_KEY);
    if(raw){
      const saved = JSON.parse(raw);
      return { ...ZZ_DEFAULTS, ...saved, favorites:{...ZZ_DEFAULTS.favorites,...(saved.favorites||{})}, memories:[...(saved.memories||ZZ_DEFAULTS.memories)], quizQuestions:[...(saved.quizQuestions||ZZ_DEFAULTS.quizQuestions)], adventureScenes:[...(saved.adventureScenes||ZZ_DEFAULTS.adventureScenes)] };
    }
  } catch(e){}
  return { ...ZZ_DEFAULTS };
}

function zzSave(data){
  try { localStorage.setItem(ZZ_STORE_KEY, JSON.stringify(data)); return true; }
  catch(e){ return false; }
}

function zzReset(){
  localStorage.removeItem(ZZ_STORE_KEY);
  return { ...ZZ_DEFAULTS };
}

// ----- 暗黑模式 -----
function initTheme(){
  const saved = localStorage.getItem('zz_theme');
  if(saved==='dark' || (!saved && window.matchMedia('(prefers-color-scheme:dark)').matches)){
    document.body.classList.add('dark');
  }
  const btn = document.getElementById('themeToggle');
  if(btn) btn.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
}

function toggleTheme(){
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('zz_theme', isDark ? 'dark' : 'light');
  const btn = document.getElementById('themeToggle');
  if(btn) btn.textContent = isDark ? '☀️' : '🌙';
}

// ----- 导航 -----
function initNav(currentPage){
  initTheme();
  const nav = document.getElementById('siteNav');
  if(!nav) return;

  const zz = zzLoad();
  const pages = [
    { href:'index.html', label:'🏠 首页' },
    { href:'love-test.html', label:'💕 爱情测试' },
    { href:'adventure.html', label:'🎮 大冒险' },
    { href:'countdown.html', label:'📅 倒计时' },
    { href:'avatar.html', label:'🎨 画像馆' },
    { href:'radio.html', label:'🎵 电台' },
    { href:'wall.html', label:'💬 留言墙' },
    { href:'quiz.html', label:'🏆 排行榜' },
    { href:'editor.html', label:'⚙ 编辑器' },
    { href:'survey.html', label:'📋 问卷' }
  ];

  const linksHTML = pages.map(p =>
    `<a href="${p.href}"${currentPage===p.href?' class="active"':''}>${p.label}</a>`
  ).join('');

  nav.innerHTML = `
    <div class="nav-inner">
      <div class="nav-brand">${zz.avatar} ${zz.name}<span>${zz.siteSubtitle}</span></div>
      <button class="nav-toggle" id="navToggle" aria-label="菜单">☰</button>
      <div class="nav-links" id="navLinks">
        ${linksHTML}
        <button class="theme-btn" id="themeToggle" onclick="toggleTheme()" title="切换主题">🌙</button>
      </div>
    </div>
  `;

  document.getElementById('navToggle').addEventListener('click',()=>{
    document.getElementById('navLinks').classList.toggle('open');
  });

  initTheme();
}

// ----- Toast -----
function showToast(msg, duration=2000){
  const t = document.createElement('div');
  t.className='toast'; t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>{ t.remove(); }, duration);
}

// ----- 日期工具 -----
function daysUntil(dateStr){
  const d = new Date(dateStr+'T00:00:00');
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.ceil((d-now)/(1000*60*60*24));
}

function formatDate(dateStr){
  const d = new Date(dateStr+'T00:00:00');
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
}

// ----- Canvas 绘图辅助 -----
function drawRoundedRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}
