"""Yerel önizleme sunucusu: proje kökünü sunar; bulunamayan dosyaları public/ altında arar
(yayında Vite public/ içeriğini sitenin köküne koyar: /fonts, /img, /models aynı adreslerden çalışsın).

Kullanım:  python3 tools/gelistir.py   →  http://localhost:8765
"""
import http.server
import os

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Isleyici(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=KOK, **k)

    def translate_path(self, path):
        yol = super().translate_path(path)
        if not os.path.exists(yol):
            yedek = super().translate_path('/public' + path.split('?', 1)[0])
            if os.path.exists(yedek):
                return yedek
        return yol


if __name__ == '__main__':
    http.server.ThreadingHTTPServer(('127.0.0.1', 8765), Isleyici).serve_forever()
