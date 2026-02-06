# Dashboard Architecture

## Layers

- `config/`: static configuration and runtime constants.
- `services/`: HTTP and session/auth external interactions.
- `utils/`: pure helpers and DOM utility wrappers.
- `modules/`: feature modules for auth, tabs, calls, and dashboard rendering.
- Root entrypoints: `index.html`, `reset-password.html`, `app.js`.

## Flow

1. `app.js` initializes `AuthModule`.
2. `AuthModule` chooses login view or dashboard view.
3. `TabsModule` handles navigation and global UI actions (`logout`, `refresh-dashboard`).
4. `DashboardModule` loads metrics and recordings.
5. `CallsModule` loads call history and transcript modal interactions.

## Conventions

- Use descriptive names for functions and variables.
- Avoid inline HTML handlers (`onclick`, `onsubmit`, etc.).
- Prefer delegated listeners with `data-*` actions.
- Handle API responses defensively (`success` and `status` compatibility).
- Escape dynamic strings or build DOM nodes directly.

## Security Defaults

- `DEV_MODE.BYPASS_LOGIN = false`
- `DEV_MODE.BYPASS_VALIDATION = false`

Enable bypass flags only for local debugging.
