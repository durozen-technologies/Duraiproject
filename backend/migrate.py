import os
import sys
from alembic.config import Config
from alembic import command

def run_migrations():
    """Run Alembic database migrations."""
    # Ensure we are in the correct directory
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    alembic_cfg_path = os.path.join(backend_dir, "alembic.ini")
    
    if not os.path.exists(alembic_cfg_path):
        print(f"Error: alembic.ini not found at {alembic_cfg_path}")
        sys.exit(1)

    print("Running database migrations...")
    try:
        # Create Alembic configuration object
        alembic_cfg = Config(alembic_cfg_path)
        
        # Run upgrade to head
        command.upgrade(alembic_cfg, "head")
        
        print("Database migrations applied successfully!")
    except Exception as e:
        print(f"Error applying migrations: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migrations()
