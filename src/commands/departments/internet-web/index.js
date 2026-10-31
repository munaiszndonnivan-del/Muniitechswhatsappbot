
import {
  createHash,
  randomInt,
  randomUUID
} from 'node:crypto';

import { lookup } from 'node:dns/promises';
import os from 'node:os';
import { runInNewContext } from 'node:vm';

const commands = [];

function add(name, description, handler) {
  commands.push({
    name,
    description,
    department: 'internet-web',
    permissions: ['user'],
    async execute(context = {}) {
      try {
        return await handler(context);
      } catch {
        return {
          text: 'The operation failed. Check your input or try again later.'
        };
      }
    }
  });
}

function inputOf({ args = [], text = '' } = {}) {
  return (text.trim() || args.join(' ')).trim();
}

function requireInput(value, usage) {
  return value
    ? null
    : { text: `Usage: ${usage}` };
}

// 1. Ping
add('ping', 'Check bot response.', async () => ({
  text: '🏓 Pong! MUNAISZN X is responding.'
}));

// 2. Uptime
add('uptime', 'Show how long the bot process has been running.', async () => {
  const seconds = Math.floor(process.uptime());
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return {
    text: `Bot uptime: ${hours} hours, ${minutes} minutes, ${seconds % 60} seconds.`
  };
});

// 3. Server information
add('serverinfo', 'Show server runtime information.', async () => ({
  text: [
    `Platform: ${os.platform()}`,
    `Architecture: ${os.arch()}`,
    `Node.js: ${process.version}`,
    `CPUs: ${os.cpus().length}`,
    `Total memory: ${(os.totalmem() / 1024 ** 3).toFixed(2)} GB`,
    `Free memory: ${(os.freemem() / 1024 ** 3).toFixed(2)} GB`
  ].join('\n')
}));

// 4. Current server date
add('date', 'Show the current server date.', async () => ({
  text: `Server date: ${new Date().toLocaleDateString()}`
}));

// 5. Current server time
add('time', 'Show the current server time.', async () => ({
  text: `Server time: ${new Date().toLocaleTimeString()}`
}));

// 6. Calculator
add('calc', 'Calculate a basic arithmetic expression.', async (context) => {
  const expression = inputOf(context);

  const missing = requireInput(expression, '.calc 25 * (4 + 2)');
  if (missing) return missing;

  if (
    expression.length > 100 ||
    !/^[0-9+\-*/().%\s]+$/.test(expression)
  ) {
    return { text: 'Only basic arithmetic expressions are allowed.' };
  }

  const result = runInNewContext(expression, Object.create(null), {
    timeout: 100
  });

  if (typeof result !== 'number' || !Number.isFinite(result)) {
    return { text: 'Invalid or non-finite calculation.' };
  }

  return { text: `Result: ${result}` };
});

// 7. UUID
add('uuid', 'Generate a random UUID.', async () => ({
  text: `UUID: ${randomUUID()}`
}));

// 8. SHA-256 hash
add('hash', 'Generate a SHA-256 hash.', async (context) => {
  const value = inputOf(context);
  const missing = requireInput(value, '.hash your text');
  if (missing) return missing;

  return {
    text: createHash('sha256').update(value).digest('hex')
  };
});

// 9. Base64 encode
add('base64encode', 'Encode text into Base64.', async (context) => {
  const value = inputOf(context);
  const missing = requireInput(value, '.base64encode hello');
  if (missing) return missing;

  return { text: Buffer.from(value, 'utf8').toString('base64') };
});

// 10. Base64 decode
add('base64decode', 'Decode Base64 text.', async (context) => {
  const value = inputOf(context);
  const missing = requireInput(value, '.base64decode aGVsbG8=');
  if (missing) return missing;

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    return { text: 'Invalid Base64 input.' };
  }

  const decoded = Buffer.from(value, 'base64');

  if (decoded.toString('base64').replace(/=+$/, '') !== value.replace(/=+$/, '')) {
    return { text: 'Invalid Base64 input.' };
  }

  return { text: decoded.toString('utf8') };
});

// 11. URL encode
add('urlencode', 'Encode text for use in URLs.', async (context) => {
  const value = inputOf(context);
  const missing = requireInput(value, '.urlencode hello world');
  if (missing) return missing;

  return { text: encodeURIComponent(value) };
});

// 12. URL decode
add('urldecode', 'Decode URL-encoded text.', async (context) => {
  const value = inputOf(context);
  const missing = requireInput(value, '.urldecode hello%20world');
  if (missing) return missing;

  try {
    return { text: decodeURIComponent(value) };
  } catch {
    return { text: 'Invalid URL-encoded input.' };
  }
});

// 13. Reverse text
add('reverse', 'Reverse supplied text.', async (context) => {
  const value = inputOf(context);
  const missing = requireInput(value, '.reverse hello');
  if (missing) return missing;

  return { text: [...value].reverse().join('') };
});

// 14. Character count
add('charcount', 'Count characters in text.', async (context) => {
  const value = inputOf(context);
  const missing = requireInput(value, '.charcount hello world');
  if (missing) return missing;

  return { text: `Characters: ${[...value].length}` };
});

// 15. Word count
add('wordcount', 'Count words in text.', async (context) => {
  const value = inputOf(context);
  const missing = requireInput(value, '.wordcount hello world');
  if (missing) return missing;

  const words = value.trim().split(/\s+/).filter(Boolean);

  return { text: `Words: ${words.length}` };
});

// 16. Uppercase
add('uppercase', 'Convert text to uppercase.', async (context) => {
  const value = inputOf(context);
  const missing = requireInput(value, '.uppercase hello');
  if (missing) return missing;

  return { text: value.toUpperCase() };
});

// 17. Lowercase
add('lowercase', 'Convert text to lowercase.', async (context) => {
  const value = inputOf(context);
  const missing = requireInput(value, '.lowercase HELLO');
  if (missing) return missing;

  return { text: value.toLowerCase() };
});

// 18. DNS lookup
add('dns', 'Look up public DNS address records.', async (context) => {
  const hostname = inputOf(context).trim().toLowerCase();
  const missing = requireInput(hostname, '.dns example.com');
  if (missing) return missing;

  if (
    hostname.length > 253 ||
    !/^(?=.{1,253}$)[a-z0-9.-]+$/.test(hostname) ||
    hostname.includes('..')
  ) {
    return { text: 'Enter a valid hostname, such as example.com.' };
  }

  const records = await lookup(hostname, { all: true });

  return {
    text: records.map((record) =>
      `${record.family === 4 ? 'IPv4' : 'IPv6'}: ${record.address}`
    ).join('\n')
  };
});

// 19. Weather lookup using Open-Meteo
add('weather', 'Get current weather for a city.', async (context) => {
  const city = inputOf(context);
  const missing = requireInput(city, '.weather Nairobi');
  if (missing) return missing;

  const geoUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
  geoUrl.searchParams.set('name', city);
  geoUrl.searchParams.set('count', '1');
  geoUrl.searchParams.set('language', 'en');
  geoUrl.searchParams.set('format', 'json');

  const geoResponse = await fetch(geoUrl, {
    signal: AbortSignal.timeout(15000)
  });

  if (!geoResponse.ok) throw new Error('Weather location lookup failed.');

  const geo = await geoResponse.json();
  const place = geo.results?.[0];

  if (!place) return { text: 'City not found.' };

  const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
  weatherUrl.searchParams.set('latitude', place.latitude);
  weatherUrl.searchParams.set('longitude', place.longitude);
  weatherUrl.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m');

  const weatherResponse = await fetch(weatherUrl, {
    signal: AbortSignal.timeout(15000)
  });

  if (!weatherResponse.ok) throw new Error('Weather lookup failed.');

  const weather = await weatherResponse.json();
  const current = weather.current;

  if (!current) return { text: 'Current weather is unavailable.' };

  return {
    text: [
      `Weather: ${place.name}, ${place.country}`,
      `Temperature: ${current.temperature_2m}°C`,
      `Feels like: ${current.apparent_temperature}°C`,
      `Humidity: ${current.relative_humidity_2m}%`,
      `Wind: ${current.wind_speed_10m} km/h`,
      'Source: Open-Meteo'
    ].join('\n')
  };
});

// 20. Currency conversion using Frankfurter
add('currency', 'Convert currencies using published exchange rates.', async (context) => {
  const parts = inputOf(context).trim().split(/\s+/);

  if (parts.length !== 3) {
    return { text: 'Usage: .currency 100 USD KES' };
  }

  const [amountText, from, to] = parts;
  const amount = Number(amountText);

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !/^[A-Za-z]{3}$/.test(from) ||
    !/^[A-Za-z]{3}$/.test(to)
  ) {
    return { text: 'Enter a positive amount and valid three-letter currency codes.' };
  }

  const url = new URL('https://api.frankfurter.dev/v1/latest');
  url.searchParams.set('base', from.toUpperCase());
  url.searchParams.set('symbols', to.toUpperCase());

  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    return { text: 'Exchange rate unavailable for those currencies.' };
  }

  const data = await response.json();
  const rate = data.rates?.[to.toUpperCase()];

  if (typeof rate !== 'number') {
    return { text: 'No exchange rate was returned.' };
  }

  return {
    text: `${amount} ${from.toUpperCase()} = ${(amount * rate).toFixed(2)} ${to.toUpperCase()}\nRate date: ${data.date}\nSource: Frankfurter`
  };
});

// 21. Country information
add('country', 'Look up basic country information.', async (context) => {
  const name = inputOf(context);
  const missing = requireInput(name, '.country Kenya');
  if (missing) return missing;

  const url = `https://restcountries.com/v3.1/name/${encodeURIComponent(name)}`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) return { text: 'Country not found.' };

  const data = await response.json();
  const country = data[0];

  return {
    text: [
      `Country: ${country.name?.common ?? 'Unknown'}`,
      `Official name: ${country.name?.official ?? 'Unknown'}`,
      `Capital: ${country.capital?.join(', ') ?? 'Unknown'}`,
      `Region: ${country.region ?? 'Unknown'}`,
      `Population: ${country.population?.toLocaleString() ?? 'Unknown'}`,
      `Area: ${country.area?.toLocaleString() ?? 'Unknown'} km²`,
      `Languages: ${Object.values(country.languages ?? {}).join(', ') || 'Unknown'}`
    ].join('\n')
  };
});

// 22. Dictionary
add('define', 'Find an English dictionary definition.', async (context) => {
  const word = inputOf(context).trim();
  const missing = requireInput(word, '.define beautiful');
  if (missing) return missing;

  if (!/^[a-zA-Z'-]{1,60}$/.test(word)) {
    return { text: 'Enter one English word.' };
  }

  const response = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
    { signal: AbortSignal.timeout(15000) }
  );

  if (!response.ok) return { text: 'No definition found.' };

  const data = await response.json();
  const entry = data[0];
  const meanings = entry.meanings ?? [];

  const lines = [`Word: ${entry.word}`];

  for (const meaning of meanings.slice(0, 3)) {
    lines.push(`\n${meaning.partOfSpeech ?? 'Meaning'}`);

    for (const definition of (meaning.definitions ?? []).slice(0, 2)) {
      lines.push(`• ${definition.definition}`);
    }
  }

  return { text: lines.join('\n').slice(0, 5000) };
});

// 23. Public GitHub repository information
add('github', 'Look up a public GitHub repository.', async (context) => {
  const value = inputOf(context).trim();
  const missing = requireInput(value, '.github owner/repository');
  if (missing) return missing;

  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) {
    return { text: 'Usage: .github owner/repository' };
  }

  const response = await fetch(
    `https://api.github.com/repos/${value}`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'MUNAISZN-X'
      },
      signal: AbortSignal.timeout(15000)
    }
  );

  if (!response.ok) return { text: 'Repository not found or GitHub request unavailable.' };

  const repo = await response.json();

  return {
    text: [
      `Repository: ${repo.full_name}`,
      `Description: ${repo.description ?? 'No description'}`,
      `Stars: ${repo.stargazers_count}`,
      `Forks: ${repo.forks_count}`,
      `Language: ${repo.language ?? 'Not specified'}`,
      `Open issues: ${repo.open_issues_count}`,
      `URL: ${repo.html_url}`
    ].join('\n')
  };
});

// 24. Random number
add('random', 'Generate a random number within a range.', async (context) => {
  const parts = inputOf(context).trim().split(/\s+/);

  if (parts.length !== 2) {
    return { text: 'Usage: .random 1 100' };
  }

  const min = Number(parts[0]);
  const max = Number(parts[1]);

  if (
    !Number.isSafeInteger(min) ||
    !Number.isSafeInteger(max) ||
    min > max ||
    max - min > 1000000000
  ) {
    return { text: 'Provide valid integer limits, with minimum no greater than maximum.' };
  }

  return { text: `Random number: ${randomInt(min, max + 1)}` };
});

// 25. Secure random password
add('password', 'Generate a random password.', async (context) => {
  const requested = inputOf(context).trim();
  const length = requested ? Number(requested) : 16;

  if (!Number.isInteger(length) || length < 8 || length > 64) {
    return { text: 'Usage: .password 16 (choose 8–64 characters)' };
  }

  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  let password = '';

  for (let index = 0; index < length; index++) {
    password += characters[randomInt(characters.length)];
  }

  return {
    text: `Generated password (${length} characters):\n${password}\n\nKeep it private.`
  };
});

export { commands };
    
