"""Start or stop the private review desk; keep its server window hidden on Windows."""
import json
import subprocess
import sys
import time
import webbrowser
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
ORIGIN = 'http://127.0.0.1:8765'


def running():
    try:
        with urlopen(ORIGIN + '/api/queue', timeout=1) as response:
            result = json.load(response)
        return result if result.get('application') == 'brown-derby-image-review' else None
    except (OSError, ValueError):
        return None


if '--close' in sys.argv:
    state = running()
    if state:
        request = Request(ORIGIN + '/api/close', data=b'{}', headers={
            'Content-Type': 'application/json', 'Origin': ORIGIN,
            'X-Review-Token': state['token']}, method='POST')
        with urlopen(request, timeout=5) as response:
            print('Review desk closed. All decisions remain saved.')
    else:
        print('Review desk is already closed.')
else:
    if not running():
        with (ROOT / 'server.log').open('ab') as log:
            subprocess.Popen([sys.executable, '-u', str(ROOT / 'review.py'), 'serve'],
                             cwd=ROOT, stdout=log, stderr=log,
                             creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        for _ in range(30):
            if running():
                break
            time.sleep(.2)
        else:
            raise SystemExit('Unable to start the review desk. See server.log in this folder.')
    webbrowser.open(ORIGIN)
