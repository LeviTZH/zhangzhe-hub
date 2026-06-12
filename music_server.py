"""
张哲电台 - 音乐搜索代理服务器
启动: python music_server.py
端口: 8765
"""
import json
import re
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler

# ========== Eason Chan 预设歌单 (网易云歌曲ID) ==========
EASON_SONGS = [
    {"id": "65766",  "title": "十年",       "artist": "陈奕迅", "album": "黑白灰"},
    {"id": "65528",  "title": "富士山下",    "artist": "陈奕迅", "album": "What's Going On...?"},
    {"id": "65538",  "title": "好久不见",    "artist": "陈奕迅", "album": "认了吧"},
    {"id": "66282",  "title": "浮夸",        "artist": "陈奕迅", "album": "U87"},
    {"id": "65800",  "title": "爱情转移",    "artist": "陈奕迅", "album": "认了吧"},
    {"id": "65639",  "title": "单车",        "artist": "陈奕迅", "album": "Shall We Dance? Shall We Talk!"},
    {"id": "65570",  "title": "最佳损友",    "artist": "陈奕迅", "album": "The Best of Eason"},
    {"id": "65643",  "title": "K歌之王(粤)", "artist": "陈奕迅", "album": "打得火热"},
    {"id": "167762", "title": "红玫瑰",      "artist": "陈奕迅", "album": "认了吧"},
    {"id": "167765", "title": "不要说话",    "artist": "陈奕迅", "album": "不想放手"},
    {"id": "65505",  "title": "K歌之王(国)", "artist": "陈奕迅", "album": "反正是我"},
    {"id": "65524",  "title": "明年今日",    "artist": "陈奕迅", "album": "The Line-Up"},
    {"id": "1901371647", "title": "孤勇者",  "artist": "陈奕迅", "album": "孤勇者"},
    {"id": "65534",  "title": "淘汰",        "artist": "陈奕迅", "album": "认了吧"},
    {"id": "167801", "title": "阴天快乐",    "artist": "陈奕迅", "album": "米·闪"},
    {"id": "65960",  "title": "因为爱情",    "artist": "陈奕迅, 王菲", "album": "Stranger Under My Skin"},
    {"id": "65685",  "title": "你的背包",    "artist": "陈奕迅", "album": "The Best of Eason"},
    {"id": "65565",  "title": "不如不见",    "artist": "陈奕迅", "album": "What's Going On...?"},
    {"id": "65530",  "title": "葡萄成熟时",  "artist": "陈奕迅", "album": "U87"},
    {"id": "167875", "title": "可以了",      "artist": "陈奕迅", "album": "米·闪"},
]


def search_netease(keyword, limit=15):
    """通过网易云搜索API获取歌曲列表"""
    import urllib.request
    import ssl

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    url = (
        "https://music.163.com/api/search/get?"
        + urllib.parse.urlencode({"s": keyword, "type": 1, "limit": limit, "offset": 0})
    )

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://music.163.com/",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "zh-CN,zh;q=0.9",
    }

    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        songs = []
        if data.get("code") == 200 and data.get("result", {}).get("songs"):
            for s in data["result"]["songs"]:
                artists = ", ".join([a.get("name", "") for a in s.get("artists", [])])
                album = s.get("album", {}) or {}
                # 封面：优先专辑图，其次歌手图
                cover = ""
                if album.get("picUrl"):
                    cover = album["picUrl"]
                elif album.get("blurPicUrl"):
                    cover = album["blurPicUrl"]
                elif album.get("picId"):
                    cover = f"https://p2.music.126.net/xxx/{album['picId']}.jpg"
                if not cover and s.get("artists"):
                    cover = s["artists"][0].get("img1v1Url", "")
                songs.append({
                    "id": str(s["id"]),
                    "title": s.get("name", ""),
                    "artist": artists,
                    "album": album.get("name", ""),
                    "cover": cover,
                    "duration": s.get("duration", 0),
                })
        return songs
    except Exception as e:
        print(f"[搜索失败] {e}")
        return []


def get_stream_url(song_id, br=320000):
    """获取网易云歌曲的播放链接"""
    import urllib.request
    import ssl

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    # 尝试获取歌曲详情
    url = f"https://music.163.com/api/song/detail/?ids=[{song_id}]"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://music.163.com/",
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        if data.get("code") == 200 and data.get("songs"):
            song = data["songs"][0]
            album_info = song.get("album", {}) or {}
            cover = album_info.get("picUrl", "") or album_info.get("blurPicUrl", "")
            # 优先高品质 mp3 URL
            h_music = song.get("hMusic") or song.get("mMusic") or song.get("lMusic")
            mp3_url = f"https://music.163.com/song/media/outer/url?id={song_id}.mp3"
            if h_music and h_music.get("id"):
                mp3_url = f"https://music.163.com/song/media/outer/url?id={h_music['id']}.mp3?br={br}"
            return {
                "mp3": mp3_url,
                "iframe": f"https://music.163.com/outchain/player?type=2&id={song_id}&auto=0&height=66",
                "cover": cover,
                "duration": song.get("duration", 0),
            }
    except Exception as e:
        print(f"[获取URL失败] {e}")
    return {"mp3": f"https://music.163.com/song/media/outer/url?id={song_id}.mp3",
            "iframe": f"https://music.163.com/outchain/player?type=2&id={song_id}&auto=0&height=66",
            "cover": "", "duration": 0}


class MusicHandler(BaseHTTPRequestHandler):

    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

    def _json(self, data):
        self.send_response(200)
        self._cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        params = dict(urllib.parse.parse_qsl(parsed.query))

        if path == "/api/ping":
            self._json({"ok": True})

        elif path == "/api/playlist":
            # 返回 Eason Chan 默认歌单
            self._json(EASON_SONGS)

        elif path == "/api/search":
            keyword = params.get("q", "")
            if not keyword:
                self._json({"error": "missing q", "songs": []})
                return
            songs = search_netease(keyword)
            self._json({"q": keyword, "songs": songs})

        elif path == "/api/song":
            song_id = params.get("id", "")
            if not song_id:
                self._json({"error": "missing id"})
                return
            info = get_stream_url(song_id)
            self._json(info)

        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {args[0]}")


if __name__ == "__main__":
    port = 8765
    server = HTTPServer(("127.0.0.1", port), MusicHandler)
    print(f"🎵 张哲音乐服务器已启动 → http://localhost:{port}")
    print(f"   歌单: http://localhost:{port}/api/playlist")
    print(f"   搜索: http://localhost:{port}/api/search?q=陈奕迅")
    print(f"   歌曲: http://localhost:{port}/api/song?id=65766")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止")
        server.shutdown()
