import sys
import os
import socket
import http.server
import socketserver
import qrcode

# WindowsコンソールでのUTF-8出力を保証
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

PORT = 8000

def get_local_ip():
    """ローカルネットワークのIPアドレスを取得"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    """キャッシュを無効化し、開発時の即時更新を保証するハンドラ"""
    def end_headers(self):
        # 開発中にファイルの変更がiPhoneに即反映されるようキャッシュを抑制
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def guess_type(self, path):
        # MIMEタイプの明示
        if path.endswith(".js") or path.endswith(".mjs"):
            return "application/javascript; charset=utf-8"
        elif path.endswith(".json") or path.endswith(".webmanifest"):
            return "application/json; charset=utf-8"
        elif path.endswith(".css"):
            return "text/css; charset=utf-8"
        elif path.endswith(".svg"):
            return "image/svg+xml"
        return super().guess_type(path)

    def log_message(self, format, *args):
        # iPhoneからのアクセス時に見やすいログを表示
        first_arg = str(args[0]) if args else ""
        if "GET" in first_arg:
            path = first_arg.split(" ")[1] if len(first_arg.split(" ")) > 1 else first_arg
            # 画像や静的アセットのログは簡潔に
            print(f"  -> iPhone request: {path}")
        else:
            super().log_message(format, *args)

def main():
    # スクリプトのディレクトリに移動
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    local_ip = get_local_ip()
    url = f"http://{local_ip}:{PORT}"

    print("=" * 60)
    print(" 🎮 スマホゲーム工房 ローカルサーバー起動中！")
    print("=" * 60)
    print(f"\n[PCからのアクセス]     : http://localhost:{PORT}")
    print(f"[iPhoneからのアクセス] : {url}\n")
    print("▼ iPhoneの標準カメラで下のQRコードを読み取ってください ▼")
    print("-" * 60)

    try:
        qr = qrcode.QRCode(border=1)
        qr.add_data(url)
        qr.print_ascii(invert=True)
    except Exception as e:
        print(f"(QR表示エラー: {e})")
        print(f"iPhoneのSafariを開き、上記URL '{url}' を手動で入力してください。")

    print("-" * 60)
    print("💡 ヒント:")
    print(" 1. PCとiPhoneが『同じWi-Fi』に接続されている必要があります。")
    print(" 2. Safariで開いた後、画面下部の『共有ボタン (四角から矢印)』をタップし、")
    print("    『ホーム画面に追加』を押すと、アドレスバーの無い全画面アプリになります！")
    print(" 3. 終了するには、この画面で [Ctrl + C] を押してください。")
    print("=" * 60 + "\n")

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nサーバーを停止しました。お疲れ様でした！")

if __name__ == "__main__":
    main()
