import dayjs from 'dayjs';

// https://github.com/iamkun/dayjs
// https://github.com/iamkun/dayjs/blob/dev/docs/en/API-reference.md#format-formatstringwithtokens-string

const convertSecondsToHHMMSS = (sec) => {
  const hrs = Math.floor(sec / 3600);
  const min = Math.floor((sec - (hrs * 3600)) / 60);
  let seconds = sec - (hrs * 3600) - (min * 60);
  seconds = Math.round(seconds * 100) / 100;

  let result = (hrs < 10 ? `0${hrs}` : hrs);
  result += `:${min < 10 ? `0${min}` : min}`;
  result += `:${seconds < 10 ? `0${seconds}` : seconds}`;
  return result;
};

export { dayjs, convertSecondsToHHMMSS };
