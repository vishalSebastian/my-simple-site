// Run the API locally:  npm run dev:api   (reads DATABASE_URL and JWT_SECRET from .env)
import app from './app.js';

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API running on http://localhost:${port}/api`));
