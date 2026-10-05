import { useEffect, useRef, useState } from 'react';

export default function ProgressBar() {
  const [value, setValue] = useState(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState('');
  const timer = useRef(null);

  useEffect(() => () => clearInterval(timer.current), []);

  const start = () => {
    setResult('');
    setRunning(true);
    timer.current = setInterval(() => {
      setValue((v) => {
        if (v >= 100) {
          clearInterval(timer.current);
          setRunning(false);
          return 100;
        }
        return v + 1;
      });
    }, 100);
  };

  const stop = () => {
    clearInterval(timer.current);
    setRunning(false);
    setResult(`Stopped at ${value}%. Target was 75%. Difference: ${value - 75}`);
  };

  const reset = () => {
    clearInterval(timer.current);
    setRunning(false);
    setValue(0);
    setResult('');
  };

  return (
    <section>
      <h1>Progress Bar</h1>
      <p>Click Start, then click Stop when the bar reaches <strong>75%</strong>.</p>
      <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} data-testid="progress-bar">
        <div className="progress-fill" style={{ width: `${value}%` }}>{value}%</div>
      </div>
      <div className="buttons">
        <button onClick={start} disabled={running} data-testid="start">Start</button>
        <button onClick={stop} disabled={!running} data-testid="stop">Stop</button>
        <button onClick={reset} data-testid="reset">Reset</button>
      </div>
      {result && <p id="result" data-testid="result">{result}</p>}
    </section>
  );
}
