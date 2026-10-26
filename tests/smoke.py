from playwright.sync_api import sync_playwright
from pathlib import Path
import json
out=Path(__file__).resolve().parent; results=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':1050})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content((Path(__file__).resolve().parents[1]/'index.html').read_text(),wait_until='domcontentloaded');page.wait_for_timeout(400)
 print('Errors',errors)
 print(page.title()); print('launch',page.locator('#launchPanel').count(),'practice',page.locator('#practiceShots').count())
 page.screenshot(path=str(out/'initial-desktop.png'),full_page=True)
 for route in ['flight','capture','video','overview','history','settings']:
  page.evaluate('(r)=>{location.hash=r}',route);page.wait_for_timeout(250)
  results.append({'name':'route '+route,'passed':page.locator('#page-'+route).is_visible()})
 for width in [390,768,1440]:
  page.set_viewport_size({'width':width,'height':900});page.evaluate("location.hash='flight'");page.wait_for_timeout(200)
  results.append({'name':f'no overflow {width}','passed':page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')})
 page.set_viewport_size({'width':390,'height':844});page.evaluate("location.hash='capture'");page.wait_for_timeout(200)
 page.screenshot(path=str(out/'capture-empty-mobile.png'),full_page=True)
 results.append({'name':'no startup or routing errors','passed':not errors,'details':errors})
 b.close()
(out/'smoke-results.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
