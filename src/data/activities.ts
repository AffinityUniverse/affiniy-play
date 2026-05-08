export type ActivityId =
  | 'memory' | 'puzzle' | 'coloring' | 'shapematch'
  | 'hidden' | 'designquiz' | 'music' | 'balloon' | 'numbermemory'
  | 'minesweeper' | 'brickbreaker' | 'dinogame' | 'planegame';

export interface ActivityInfo {
  id: ActivityId;
  title: string;
  tagline: string;
  image: string;
  bg: string;
  accent: string;
}

export const activities: ActivityInfo[] = [
  { id: 'memory',       title: '기억력 놀이',    tagline: '짝을 찾아보세요!',           image: 'slice/slice2.png', bg: '#FFE9D5', accent: '#FF8C42' },
  { id: 'puzzle',       title: '그림 맞추기',    tagline: '조각을 맞춰보세요!',          image: 'slice/slice5.png', bg: '#D5E8FF', accent: '#4D72FB' },
  { id: 'coloring',     title: '색칠놀이',       tagline: '예쁘게 칠해봐요!',            image: 'slice/slice6.png', bg: '#FFD5E9', accent: '#FF5FA0' },
  { id: 'shapematch',   title: '모양 맞추기',    tagline: '끌어다 놓아봐요!',            image: 'slice/slice4.png', bg: '#FFFBD5', accent: '#E8C000' },
  { id: 'hidden',       title: '숨은 친구 찾기', tagline: '어디에 숨었을까요?',          image: 'slice/slice7.png', bg: '#D5F5E3', accent: '#27AE60' },
  { id: 'designquiz',   title: '디자인 퀴즈',    tagline: '디자인 지식을 테스트해봐요!', image: 'slice/slice3.png', bg: '#E9D5FF', accent: '#8E44AD' },
  { id: 'music',        title: '악기 놀이',      tagline: '음악을 만들어봐요!',          image: 'slice/slice9.png', bg: '#D5F5FF', accent: '#0099CC' },
  { id: 'balloon',      title: '풍선 터뜨리기',  tagline: '같은 색 풍선을 터뜨려요!',   image: 'slice/slice5.png', bg: '#FFD5D5', accent: '#FF4444' },
  { id: 'numbermemory', title: '숫자 기억하기',  tagline: '순서를 기억해봐요!',          image: 'slice/slice4.png', bg: '#D5FFE9', accent: '#27AE60' },
  { id: 'minesweeper',  title: '지뢰찾기',       tagline: '안전한 칸을 찾아요!',         image: 'slice/slice7.png', bg: '#D5E8FF', accent: '#2980B9' },
  { id: 'brickbreaker', title: '벽돌깨기',       tagline: '공으로 벽돌을 깨요!',         image: 'slice/slice2.png', bg: '#FFE9D5', accent: '#E67E22' },
  { id: 'dinogame',     title: '달리기 게임',    tagline: '장애물을 피해요!',            image: 'slice/slice5.png', bg: '#D5F5E3', accent: '#27AE60' },
  { id: 'planegame',   title: '비행기 게임',    tagline: '벽 사이를 날아요!',           image: 'slice/slice3.png', bg: '#D5EEFF', accent: '#0099CC' },
];
