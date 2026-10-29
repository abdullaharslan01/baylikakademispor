"""Dönüştürücü için küçük yerel sunucu: proje kökünü servis eder, POST /kaydet?ad=... ile public/models/ altına dosya yazar.

Kullanım:  python3 tools/kaydet.py   →  http://localhost:8777/tools/fbx2glb.html
"""
import http.server
import os
import re
import urllib.parse

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HEDEF = os.path.join(KOK, 'public', 'models')


class Isleyici(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=KOK, **k)

    def do_POST(self):
        u = urllib.parse.urlparse(self.path)
        ad = urllib.parse.parse_qs(u.query).get('ad', [''])[0]
        if u.path != '/kaydet' or not re.fullmatch(r'[a-z0-9_-]+\.(glb|json|mp4|webm|jpg)', ad):
            self.send_error(400)
            return
        uzunluk = int(self.headers.get('Content-Length', 0))
        hedef = os.path.join(KOK, 'public', 'video') if ad.endswith(('.mp4', '.webm', '.jpg')) else HEDEF
        os.makedirs(hedef, exist_ok=True)
        with open(os.path.join(hedef, ad), 'wb') as f:
            f.write(self.rfile.read(uzunluk))
        self.send_response(204)
        self.end_headers()


if __name__ == '__main__':
    http.server.ThreadingHTTPServer(('127.0.0.1', 8777), Isleyici).serve_forever()
