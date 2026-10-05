import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

// Delay can be changed via the URL, e.g. #/delay?ms=12000 (default 8000)
export default function DelayedMessage() {
  const [params] = useSearchParams();
  const delay = Number(params.get('ms')) || 8000;
  const [status, setStatus] = useState('idle'); // idle | loading | done

  const start = () => {
    setStatus('loading');
    setTimeout(() => setStatus('done'), delay);
  };

  return (
    <section>
      <h1>Delayed Message</h1>
      <p>Click Start. The message appears after about {delay / 1000} seconds.</p>

      <div id="start">
        <button onClick={start} disabled={status === 'loading'} data-testid="start-button">
          Start
        </button>
      </div>

      {status === 'loading' && (
        <div id="loading" data-testid="loading" className="loading">Loading...</div>
      )}

      {status === 'done' && (
        <div id="finish" data-testid="finish">
          <h4>Hello World!</h4>
        </div>
      )}
    </section>
  );
}
