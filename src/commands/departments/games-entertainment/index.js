
import { randomInt } from 'node:crypto';

const commands = [];

function add(name, description, handler) {
  commands.push({
    name,
    description,
    department: 'games-entertainment',
    permissions: ['user'],
    async execute(context = {}) {
      try {
        return await handler(context);
      } catch {
        return { text: 'Something went wrong. Please try again.' };
      }
    }
  });
}

function inputOf({ args = [], text = '' } = {}) {
  return (text.trim() || args.join(' ')).trim();
}

const pick = (items) => items[randomInt(items.length)];

const jokes = [
  'Why did the computer go to the doctor? It had a virus!',
  'Why was the maths book sad? It had too many problems.',
  'Why did the bicycle fall over? It was two-tired.',
  'What do you call a sleeping bull? A bulldozer.',
  'Why did the phone wear glasses? It lost its contacts.',
  'Why did the student eat his homework? The teacher said it was a piece of cake.',
  'What do you call cheese that is not yours? Nacho cheese.',
  'Why was the calendar popular? It had so many dates.'
];

const riddles = [
  { q: 'What has keys but cannot open locks?', a: 'A piano.' },
  { q: 'What gets wetter as it dries?', a: 'A towel.' },
  { q: 'What has a face and two hands but no arms or legs?', a: 'A clock.' },
  { q: 'What has a neck but no head?', a: 'A bottle.' },
  { q: 'What goes up but never comes down?', a: 'Your age.' },
  { q: 'What has many teeth but cannot bite?', a: 'A comb.' },
  { q: 'What can travel around the world while staying in one corner?', a: 'A stamp.' },
  { q: 'What has one eye but cannot see?', a: 'A needle.' }
];

const truths = [
  'What is one thing you are afraid to admit?',
  'What is your most embarrassing moment?',
  'Who was your first crush?',
  'What is one secret talent you have?',
  'What is the biggest lie you have ever told?',
  'What is one thing you wish you could change about yourself?'
];

const dares = [
  'Sing your favourite song for 20 seconds.',
  'Talk in a funny accent for the next two minutes.',
  'Do ten jumping jacks.',
  'Send someone a genuine compliment.',
  'Try to say the alphabet backwards.',
  'Dance without music for 30 seconds.'
];

// 1. Coin flip
add('coinflip', 'Flip a virtual coin.', async () => ({
  text: `🪙 ${pick(['Heads', 'Tails'])}!`
}));

// 2. Dice
add('dice', 'Roll a six-sided dice.', async () => ({
  text: `🎲 You rolled ${randomInt(1, 7)}.`
}));

// 3. Multiple dice
add('rolldice', 'Roll multiple six-sided dice.', async (context) => {
  const count = Number(inputOf(context) || 2);

  if (!Number.isInteger(count) || count < 1 || count > 10) {
    return { text: 'Usage: .rolldice 2 (maximum 10 dice)' };
  }

  const results = Array.from(
    { length: count },
    () => randomInt(1, 7)
  );

  return {
    text: `🎲 Results: ${results.join(', ')}\nTotal: ${results.reduce((a, b) => a + b, 0)}`
  };
});

// 4. Rock paper scissors
add('rps', 'Play rock paper scissors against the bot.', async (context) => {
  const choice = inputOf(context).toLowerCase();
  const options = ['rock', 'paper', 'scissors'];

  if (!options.includes(choice)) {
    return { text: 'Usage: .rps rock OR .rps paper OR .rps scissors' };
  }

  const bot = pick(options);

  let result = 'It is a draw!';

  if (
    (choice === 'rock' && bot === 'scissors') ||
    (choice === 'paper' && bot === 'rock') ||
    (choice === 'scissors' && bot === 'paper')
  ) {
    result = 'You win! 🎉';
  } else if (choice !== bot) {
    result = 'MUNAISZN X wins! 🤖';
  }

  return {
    text: `You: ${choice}\nBot: ${bot}\n${result}`
  };
});

// 5. Magic 8 ball
add('8ball', 'Get a random magic 8-ball answer.', async () => ({
  text: `🎱 ${pick([
    'Absolutely!',
    'Definitely not.',
    'The signs point to yes.',
    'Ask again later.',
    'It is uncertain.',
    'Very likely.',
    'Do not count on it.',
    'Without a doubt.'
  ])}`
}));

// 6. Random choice
add('choose', 'Choose randomly from a list of options.', async (context) => {
  const options = inputOf(context)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (options.length < 2 || options.length > 50) {
    return { text: 'Usage: .choose Tea, Coffee, Juice' };
  }

  return { text: `My choice: ${pick(options)}` };
});

// 7. Random number game
add('numbergame', 'Generate a secret number challenge.', async (context) => {
  const max = Number(inputOf(context) || 100);

  if (!Number.isSafeInteger(max) || max < 2 || max > 1000000) {
    return { text: 'Usage: .numbergame 100 (maximum 1,000,000)' };
  }

  return {
    text: `🎯 Guess the number between 1 and ${max}!\nI have chosen a secret number. Send your guess to a friend and challenge them.`
  };
});

// 8. Trivia
add('trivia', 'Get a random general knowledge question and answer.', async () => {
  const questions = [
    { q: 'What is the largest planet in our solar system?', a: 'Jupiter.' },
    { q: 'What is the capital of Japan?', a: 'Tokyo.' },
    { q: 'How many continents are there?', a: 'Seven.' },
    { q: 'Which planet is known as the Red Planet?', a: 'Mars.' },
    { q: 'What is the chemical symbol for gold?', a: 'Au.' },
    { q: 'Which ocean is the largest?', a: 'The Pacific Ocean.' },
    { q: 'Who wrote Romeo and Juliet?', a: 'William Shakespeare.' },
    { q: 'What is the fastest land animal?', a: 'The cheetah.' }
  ];

  const item = pick(questions);

  return {
    text: `🧠 TRIVIA\n\n${item.q}\n\nAnswer: ${item.a}`
  };
});

// 9. Riddle
add('riddle', 'Get a random riddle and its answer.', async () => {
  const item = pick(riddles);

  return {
    text: `🧩 RIDDLE\n\n${item.q}\n\nAnswer: ${item.a}`
  };
});

// 10. Joke
add('joke', 'Tell a random joke.', async () => ({
  text: `😂 ${pick(jokes)}`
}));

// 11. Would you rather
add('wouldyourather', 'Get a would-you-rather question.', async () => ({
  text: `🤔 WOULD YOU RATHER?\n\n${pick([
    'Travel to the past or travel to the future?',
    'Be able to fly or become invisible?',
    'Live by the ocean or in the mountains?',
    'Have unlimited money or unlimited time?',
    'Never use social media again or never watch TV again?',
    'Know every language or play every musical instrument?',
    'Be famous or be extremely wealthy but unknown?',
    'Explore space or explore the deepest ocean?'
  ])}`
}));

// 12. Truth
add('truth', 'Get a truth question.', async () => ({
  text: `💬 TRUTH:\n${pick(truths)}`
}));

// 13. Dare
add('dare', 'Get a harmless dare.', async () => ({
  text: `🔥 DARE:\n${pick(dares)}`
}));

// 14. Compliment
add('compliment', 'Generate a positive compliment.', async (context) => {
  const person = inputOf(context) || 'You';

  if (person.length > 60) {
    return { text: 'Please use a shorter name.' };
  }

  return {
    text: `${person}, ${pick([
      'your kindness makes a difference.',
      'you have a wonderful way of making people smile.',
      'your determination is admirable.',
      'you bring positive energy wherever you go.',
      'you deserve to be proud of yourself.',
      'your creativity is something special.'
    ])}`
  };
});

// 15. Friendly roast
add('roast', 'Generate a harmless playful roast.', async () => ({
  text: `😂 ${pick([
    'You are like a software update. Nobody asked, but here you are.',
    'Your Wi-Fi signal has more direction than you.',
    'You bring everyone so much joy... when you leave the room.',
    'You are proof that loading screens can become people.',
    'Even your alarm clock has stopped believing in you.',
    'Your brain has too many tabs open.'
  ])}`
}));

// 16. Friendship compatibility
add('ship', 'Generate a playful friendship compatibility score.', async (context) => {
  const names = inputOf(context).split(',').map((v) => v.trim());

  if (names.length !== 2 || names.some((v) => !v || v.length > 40)) {
    return { text: 'Usage: .ship Alex, Jordan' };
  }

  const score = randomInt(1, 101);

  return {
    text: `💞 ${names[0]} + ${names[1]}\nFriendship score: ${score}%\n\nJust for fun — not a real compatibility test!`
  };
});

// 17. Rate
add('rate', 'Give a random fun rating.', async (context) => {
  const subject = inputOf(context);

  if (!subject || subject.length > 100) {
    return { text: 'Usage: .rate my dancing' };
  }

  return {
    text: `⭐ I rate "${subject}" ${randomInt(1, 11)}/10!`
  };
});

// 18. Emoji reaction
add('emojify', 'Add a playful emoji reaction to text.', async (context) => {
  const value = inputOf(context);

  if (!value || value.length > 500) {
    return { text: 'Usage: .emojify I love weekends' };
  }

  return {
    text: `${pick(['😂', '🔥', '❤️', '✨', '😎', '🥳', '💯'])} ${value} ${pick(['😂', '🔥', '❤️', '✨', '😎', '🥳', '💯'])}`
  };
});

// 19. Quote
add('quote', 'Share an inspirational quote.', async () => ({
  text: `✨ ${pick([
    '"Great things are done by a series of small things brought together." — Vincent van Gogh',
    '"It always seems impossible until it is done." — Nelson Mandela',
    '"The secret of getting ahead is getting started." — Mark Twain',
    '"Well done is better than well said." — Benjamin Franklin',
    '"Believe you can and you are halfway there." — Theodore Roosevelt'
  ])}`
}));

// 20. Fortune
add('fortune', 'Get a light-hearted fortune.', async () => ({
  text: `🔮 ${pick([
    'A new opportunity may be closer than you think.',
    'Your patience will reward you.',
    'A small step today can create a big change tomorrow.',
    'Someone may appreciate your kindness today.',
    'Keep learning. Your next skill may open a new door.',
    'Good things often begin with courage.'
  ])}`
}));

// 21. Random fact
add('funfact', 'Share a random general knowledge fact.', async () => ({
  text: `🧠 ${pick([
    'Octopuses have three hearts.',
    'A day on Venus is longer than its year.',
    'Honey can remain edible for an extremely long time when properly sealed.',
    'Bananas are botanically berries.',
    'Sharks existed before trees.',
    'The Eiffel Tower can become slightly taller during hot weather.',
    'Wombats produce cube-shaped droppings.'
  ])}`
}));

// 22. Nickname generator
add('nickname', 'Generate a playful nickname.', async (context) => {
  const name = inputOf(context) || 'Friend';

  if (name.length > 40) {
    return { text: 'Please use a shorter name.' };
  }

  return {
    text: `Your nickname: ${name} ${pick([
      'the Great', 'Legend', 'the Explorer', 'the Brave',
      'Star', 'the Genius', 'Champ', 'the Maverick'
    ])}`
  };
});

// 23. Countdown
add('countdown', 'Calculate the time remaining until a date.', async (context) => {
  const value = inputOf(context);
  const missing = !value;

  if (missing) return { text: 'Usage: .countdown 2027-01-01' };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { text: 'Use date format YYYY-MM-DD.' };
  }

  const target = new Date(`${value}T00:00:00`);
  if (Number.isNaN(target.getTime()) || target.toISOString().slice(0, 10) !== value) {
    return { text: 'That is not a valid calendar date.' };
  }

  const days = Math.ceil((target.getTime() - Date.now()) / 86400000);

  return {
    text: days > 0
      ? `${days} day(s) remaining until ${value}.`
      : days === 0
        ? `${value} is today!`
        : `${value} was ${Math.abs(days)} day(s) ago.`
  };
});

// 24. Age calculator
add('age', 'Calculate age from a date of birth.', async (context) => {
  const value = inputOf(context);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { text: 'Usage: .age 2000-05-20' };
  }

  const birth = new Date(`${value}T00:00:00`);
  const today = new Date();

  if (
    Number.isNaN(birth.getTime()) ||
    birth.toISOString().slice(0, 10) !== value ||
    birth > today
  ) {
    return { text: 'Enter a valid birth date in the past.' };
  }

  let age = today.getFullYear() - birth.getFullYear();

  const birthdayNotReached =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() &&
      today.getDate() < birth.getDate());

  if (birthdayNotReached) age--;

  return { text: `Age: ${age} years.` };
});

// 25. Zodiac sign
add('zodiac', 'Find a Western zodiac sign from a birth date.', async (context) => {
  const value = inputOf(context);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { text: 'Usage: .zodiac 2000-04-15' };
  }

  const date = new Date(`${value}T12:00:00`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return { text: 'Enter a valid date in YYYY-MM-DD format.' };
  }

  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  const signs = [
    [1, 20, 'Aquarius'],
    [2, 19, 'Pisces'],
    [3, 21, 'Aries'],
    [4, 20, 'Taurus'],
    [5, 21, 'Gemini'],
    [6, 21, 'Cancer'],
    [7, 23, 'Leo'],
    [8, 23, 'Virgo'],
    [9, 23, 'Libra'],
    [10, 23, 'Scorpio'],
    [11, 22, 'Sagittarius'],
    [12, 22, 'Capricorn']
  ];

  let sign = 'Capricorn';

  for (const [startMonth, startDay, name] of signs) {
    if (
      month > startMonth ||
      (month === startMonth && day >= startDay)
    ) {
      sign = name;
    }
  }

  return {
    text: `♈ Your Western zodiac sign is ${sign}.\nThis is an entertainment feature, not a scientific personality assessment.`
  };
});

export { commands };
  
