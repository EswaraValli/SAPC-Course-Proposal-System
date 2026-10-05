import os
import sys
from pathlib import Path

# Ensure backend directory is in python search path
BASE_DIR = Path(__file__).resolve().parent
backend_dir = BASE_DIR / 'backend'
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app import create_app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
