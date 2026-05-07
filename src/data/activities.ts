export type ActivityId =
  | 'memory' | 'puzzle' | 'coloring' | 'shapematch'
  | 'hidden' | 'colormatch' | 'music' | 'balloon' | 'numbermemory';

export interface ActivityInfo {
  id: ActivityId;
  title: string;
  tagline: string;
  image: string;
  bg: string;
  accent: string;
}

export const activities: ActivityInfo[] = [
  { id: 'memory',      title: '기억력 놀이',    tagline: '짝을 찾아보세요!',        image: '/slice/slice2.png', bg: '#FFE9D5', accent: '#FF8C42' },
  { id: 'puzzle',      title: '그림 맞추기',    tagline: '조각을 맞춰보세요!',       image: '/slice/slice5.png', bg: '#D5E8FF', accent: '#4D72FB' },
  { id: 'coloring',    title: '색칠놀이',       tagline: '예쁘게 칠해봐요!',         image: '/slice/slice6.png', bg: '#FFD5E9', accent: '#FF5FA0' },
  { id: 'shapematch',  title: '모양 맞추기',    tagline: '끌어다 놓아봐요!',         image: '/slice/slice4.png', bg: '#FFFBD5', accent: '#E8C000' },
  { id: 'hidden',      title: '숨은 친구 찾기', tagline: '어디에 숨었을까요?',       image: '/slice/slice7.png', bg: '#D5F5E3', accent: '#27AE60' },
  { id: 'colormatch',  title: '색깔 맞추기',    tagline: '같은 색을 눌러요!',        image: '/slice/slice3.png', bg: '#E9D5FF', accent: '#8E44AD' },
  { id: 'music',       title: '악기 놀이',      tagline: '음악을 만들어봐요!',       image: '/slice/slice9.png', bg: '#D5F5FF', accent: '#0099CC' },
  { id: 'balloon',     title: '풍선 터뜨리기',  tagline: '같은 색 풍선을 터뜨려요!', image: '/slice/slice5.png', bg: '#FFD5D5', accent: '#FF4444' },
  { id: 'numbermemory',title: '숫자 기억하기',  tagline: '순서를 기억해봐요!',       image: '/slice/slice4.png', bg: '#D5FFE9', accent: '#27AE60' },
];
