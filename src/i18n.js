// list 3 supported language codes
// keeps only ru, uk, and en
export const LANG_CODES = [
'ru',
'uk',
'en',
];

// store UI strings for 3 languages
// title stays Cyber Node 7 everywhere
export const I18N = {
ru: {
title: 'Cyber Node 7',
modeCampaign: 'Кампания',
modeFree: 'Свободная сеть',
levelShort: 'УР.',
bonusTag: 'БОНУС x2',
score: 'Счет',
best: 'Рекорд',
moves: 'Ходы',
coins: 'Монеты',
play: 'Играть',
buy: 'Купить',
free: 'Открыто',
selected: 'Выбрано',
colorsLabel: 'Цветов:',
gridLabel: 'Плата:',
undo: 'Отмена',
laser: 'Импульс',
teleport: 'Телепорт',
hintLaser:
'Ткни в 1 узел для удаления',
hintTeleport:
'Выбери узел и пустой сокет',
restart: 'Заново',
toMenu: 'В меню',
settings: 'Настройки',
langLabel: 'Язык:',
soundOn: 'Звук: ВКЛ',
soundOff: 'Звук: ВЫКЛ',
soundVol: 'Громкость звука:',
musicOn: 'Музыка: ВКЛ',
musicOff: 'Музыка: ВЫКЛ',
musicVol: 'Громкость музыки:',
debugBtn: 'ДЕБАГ',
levelDone: 'Стол пройден!',
nextLevel: 'Следующий стол',
overloadPrompt:
'Плата перегружена! Стереть 10 ' +
'узлов и продолжить за рекламу / ' +
'50 монет?',
boosterAdPrompt:
'Не хватает монет! Получить ' +
'бустер за просмотр рекламы?',
watchAd: 'Реклама (3с)',
payCoins: 'За монеты',
yes: 'Да',
no: 'Нет',
adWatching: 'Идет реклама...',
gameOver: 'Плата перегружена',
tryAgain: 'Сыграть снова',
goalChains: 'Цепи:',
goalScore: 'Очки:',
goalRainbow: 'Радуга 9+:',
goalColors: 'Цветные:',
theme_obsidian: 'Кибер Обсидиан',
theme_matrix: 'Матрица Неон',
theme_synthwave: 'Синтвейв Плата',
theme_arctic: 'Арктик Хром',
},
uk: {
title: 'Cyber Node 7',
modeCampaign: 'Кампанія',
modeFree: 'Вільна мережа',
levelShort: 'РІВ.',
bonusTag: 'БОНУС x2',
score: 'Рахунок',
best: 'Рекорд',
moves: 'Ходи',
coins: 'Монети',
play: 'Грати',
buy: 'Купити',
free: 'Відкрито',
selected: 'Обрано',
colorsLabel: 'Кольорів:',
gridLabel: 'Плата:',
undo: 'Відміна',
laser: 'Імпульс',
teleport: 'Телепорт',
hintLaser:
'Торкнись 1 вузла для стирання',
hintTeleport:
'Обери вузол і вільний сокет',
restart: 'Заново',
toMenu: 'У меню',
settings: 'Налаштування',
langLabel: 'Мова:',
soundOn: 'Звук: УВІМК',
soundOff: 'Звук: ВИМК',
soundVol: 'Гучність звуку:',
musicOn: 'Музика: УВІМК',
musicOff: 'Музика: ВИМК',
musicVol: 'Гучність музики:',
debugBtn: 'ДЕБАГ',
levelDone: 'Стіл пройдено!',
nextLevel: 'Наступний стіл',
overloadPrompt:
'Плату перевантажено! Стерти 10 ' +
'вузлів і продовжити за рекламу / ' +
'50 монет?',
boosterAdPrompt:
'Бракує монет! Отримати ' +
'бустер за перегляд реклами?',
watchAd: 'Реклама (3с)',
payCoins: 'За монети',
yes: 'Так',
no: 'Ні',
adWatching: 'Йде реклама...',
gameOver: 'Плату перевантажено',
tryAgain: 'Зіграти знову',
goalChains: 'Ланцюги:',
goalScore: 'Очки:',
goalRainbow: 'Веселка 9+:',
goalColors: 'Кольорові:',
theme_obsidian: 'Кібер Обсидіан',
theme_matrix: 'Матриця Неон',
theme_synthwave: 'Сінтвейв Плата',
theme_arctic: 'Арктик Хром',
},
en: {
title: 'Cyber Node 7',
modeCampaign: 'Campaign',
modeFree: 'Free Grid',
levelShort: 'LV.',
bonusTag: 'BONUS x2',
score: 'Score',
best: 'Best',
moves: 'Moves',
coins: 'Coins',
play: 'Play',
buy: 'Unlock',
free: 'Unlocked',
selected: 'Active',
colorsLabel: 'Colors:',
gridLabel: 'Board:',
undo: 'Undo',
laser: 'Laser',
teleport: 'Teleport',
hintLaser:
'Tap any 1 node to erase it',
hintTeleport:
'Pick node then empty socket',
restart: 'Restart',
toMenu: 'Main Menu',
settings: 'Settings',
langLabel: 'Language:',
soundOn: 'Sound: ON',
soundOff: 'Sound: OFF',
soundVol: 'Sound Volume:',
musicOn: 'Music: ON',
musicOff: 'Music: OFF',
musicVol: 'Music Volume:',
debugBtn: 'DEBUG',
levelDone: 'Board Cleared!',
nextLevel: 'Next Board',
overloadPrompt:
'Board overloaded! Erase 10 random ' +
'nodes and continue via Ad / ' +
'50 coins?',
boosterAdPrompt:
'Not enough coins! Watch a short ' +
'video to activate booster?',
watchAd: 'Watch Ad (3s)',
payCoins: 'Use Coins',
yes: 'Yes',
no: 'No',
adWatching: 'Playing Ad...',
gameOver: 'Board Overloaded',
tryAgain: 'Play Again',
goalChains: 'Chains:',
goalScore: 'Score:',
goalRainbow: 'Rainbow 9+:',
goalColors: 'Color Chains:',
theme_obsidian: 'Cyber Obsidian',
theme_matrix: 'Matrix Emerald',
theme_synthwave: 'Synthwave PCB',
theme_arctic: 'Arctic Chrome',
},
};

// get dictionary for language code
// falls back to russian if unknown
export function getDict(lang) {
return I18N[lang] || I18N.ru;
}
