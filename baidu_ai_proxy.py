"""
百度 AI 代理服务器 — 解决浏览器 CORS 跨域问题
===============================================
浏览器不能直接跨域调用 aip.baidubce.com，
本代理在本地运行，转发请求到百度 AI 并添加 CORS 头。

启动方式：
  python baidu_ai_proxy.py
  或双击 start_画像馆.bat

端口：8766
"""
import http.server
import json
import urllib.request
import urllib.parse
import ssl
import os
import sys

PORT = 8766
BAIDU_OAUTH = 'https://aip.baidubce.com/oauth/2.0/token'
BAIDU_ANIME = 'https://aip.baidubce.com/rest/2.0/image-process/v1/selfie_anime'
BAIDU_MERGE = 'https://aip.baidubce.com/rest/2.0/face/v1/merge'

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}


class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f'[{self.log_date_time_string()}] {args[0]}')

    def _send_cors(self, status=200, content_type='application/json'):
        self.send_response(status)
        for k, v in CORS_HEADERS.items():
            self.send_header(k, v)
        self.send_header('Content-Type', content_type)
        self.end_headers()

    def do_OPTIONS(self):
        """Preflight CORS request"""
        self._send_cors(204)

    def _proxy_post(self, url, body_bytes, content_type='application/x-www-form-urlencoded'):
        """Forward POST request to Baidu AI"""
        req = urllib.request.Request(url, data=body_bytes, method='POST')
        req.add_header('Content-Type', content_type)
        req.add_header('Accept', 'application/json')

        # 忽略 SSL 验证（公司网络可能有代理证书问题）
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        try:
            resp = urllib.request.urlopen(req, context=ctx, timeout=30)
            return resp.read(), resp.status
        except urllib.error.HTTPError as e:
            return e.read(), e.code
        except Exception as e:
            return json.dumps({'error': str(e)}).encode(), 502

    def do_POST(self):
        path = self.path.split('?')[0]
        content_len = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_len) if content_len > 0 else b''

        try:
            if path == '/api/baidu/token':
                result, status = self._proxy_post(BAIDU_OAUTH, body)
                self._send_cors(status)
                self.wfile.write(result)

            elif path == '/api/baidu/anime':
                # 从 body 中提取 access_token 并拼接到 URL
                body_str = body.decode('utf-8', errors='replace')
                params = dict(urllib.parse.parse_qsl(body_str))
                token = params.pop('access_token', '')
                new_body = urllib.parse.urlencode(params).encode()
                url = BAIDU_ANIME + '?access_token=' + token
                result, status = self._proxy_post(url, new_body)
                self._send_cors(status)
                self.wfile.write(result)

            elif path == '/api/baidu/merge':
                # Merge API expects JSON body with nested objects
                body_json = json.loads(body.decode('utf-8'))
                token = body_json.pop('access_token', '')
                new_body = json.dumps(body_json).encode()
                url = BAIDU_MERGE + '?access_token=' + token
                result, status = self._proxy_post(url, new_body, 'application/json')
                self._send_cors(status)
                self.wfile.write(result)

            else:
                self._send_cors(404)
                self.wfile.write(json.dumps({'error': f'Unknown endpoint: {path}'}).encode())

        except Exception as e:
            self._send_cors(500)
            self.wfile.write(json.dumps({'error': str(e)}).encode())


def main():
    print('=' * 55)
    print('  百度 AI 代理服务器')
    print('  端口: {} | 用途: 解决 CORS 跨域问题'.format(PORT))
    print('  按 Ctrl+C 停止服务')
    print('=' * 55)

    server = http.server.HTTPServer(('127.0.0.1', PORT), ProxyHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n服务已停止')
        server.server_close()


if __name__ == '__main__':
    main()
