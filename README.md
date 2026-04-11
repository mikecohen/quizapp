# MyQuiz

Local browser-based quiz app for students preparing for tests.

## Start

```bash
./start.sh
```

Then open `http://localhost:8000`.

## Stop

```bash
./stop.sh
```

## Quiz import format

In `Test Setup`, either paste JSON directly or choose a local `.json` file from your machine. The expected shape is:

```json
{
  "title": "Biology Review",
  "description": "Optional description",
  "questions": [
    {
      "prompt": "Question text",
      "options": ["Choice A", "Choice B", "Choice C"],
      "correctIndex": 1,
      "explanation": "Why the correct answer is right"
    }
  ]
}
```

Notes:

- `options` can contain any number of answer choices, but at least 2.
- `correctIndex` is zero-based, so `1` means the second option is correct.
- Saving a quiz with the same title updates that saved test.
- Tests and attempt history are stored in the browser's `localStorage`.

See [`sample-quiz.json`](sample-quiz.json) for a complete example.

## App flow

- `Home` explains the app, shows recent results, and points the user to the next steps.
- `Tests` is the test library page with saved tests and a `New test` button.
- `Test Setup` is where you paste JSON or load a local `.json` file, then save or update tests.
- `Test Experience` starts when you choose a saved test and shows live `Right`, `Wrong`, and `Remaining` counts while you answer.
