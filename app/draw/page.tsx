import { promises as fs } from 'fs';
import path from 'path';

export default async function DrawResult() {
  const filePath = path.join(process.cwd(), 'draw.json');
  const raw = await fs.readFile(filePath, 'utf-8');
  const result = JSON.parse(raw);

  return (
    <main className="p-6">
      <h1 className="text-4xl font-bold mb-4">🎉 Draw Result</h1>

      <p className="text-xl mb-2">
        🏆 <strong>Winner FID:</strong> {result.winnerFID}
      </p>
      <p className="text-xl mb-4">
        🎯 <strong>Tournament:</strong> {result.tournament}
      </p>

      <p className="text-lg text-yellow-300">
        📣 Finishing position will be casted when all tournaments have finished.
      </p>
    </main>
  );
}
