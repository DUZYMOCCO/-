from playwright.sync_api import sync_playwright
import json, time
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",headless=True,args=["--enable-unsafe-swiftshader"])
 c=b.new_context(viewport={"width":390,"height":844},device_scale_factor=2,has_touch=True,is_mobile=True,service_workers="block")
 p=c.new_page(); errors=[];p.on("pageerror",lambda e:errors.append(str(e)));p.goto("http://127.0.0.1:8800/");p.locator('[data-game-id="bot-commander"]').click();p.wait_for_function("window.__botCommander?.ready",timeout=90000)
 script={"id":"review3-read-test","cast":{"NEJI":"neutral"},"lines":[{"who":"NEJI","text":"テスト"}]}
 def start():
  p.evaluate("s=>{__botCommander.playDialog(s)}",script);p.wait_for_selector(".dlg",timeout=30000)
 def read(): return p.evaluate("JSON.parse(localStorage.getItem('game_studio_bc-dialog-read')||'[]')")
 start(); result={"first_top_hidden":p.locator(".dlg-top-skip").is_hidden()};p.locator(".dlg-menu-btn").click();result["first_menu_hidden"]=p.locator(".dlg-skip").is_hidden();p.evaluate("document.querySelector('.dlg-skip').dispatchEvent(new MouseEvent('click',{bubbles:true}))");result["forced_click_still_open"]=p.locator(".dlg").count()==1;p.evaluate("__dialog.skip()");p.wait_for_selector(".dlg",state="detached");result["aborted_read"]=read()
 start();p.evaluate("__dialog.tap(); __dialog.tap()");p.wait_for_selector(".dlg",state="detached");result["completed_read"]=read()
 start();result["again_top_visible"]=p.locator(".dlg-top-skip").is_visible();p.locator(".dlg-menu-btn").click();result["again_menu_visible"]=p.locator(".dlg-skip").is_visible();time.sleep(0.5);p.screenshot(path="out/shots/dialog-read-menu.png");p.locator(".dlg-skip").click();p.wait_for_selector(".dlg",state="detached");result["errors"]=errors
 assert result["first_top_hidden"] and result["first_menu_hidden"] and result["forced_click_still_open"]
 assert result["aborted_read"] == [] and result["completed_read"] == ["review3-read-test"]
 assert result["again_top_visible"] and result["again_menu_visible"] and not errors
 print(json.dumps(result,ensure_ascii=False));b.close()
