// Personalize the surprise here.
export const MOM_NAME = "Mom";
export const MY_NAME = "Your Loving Child";

export interface SlideButton {
  id: string;
  label: string;
}

export interface SlideData {
  id: string;
  title: string;
  text: string;
  buttons: SlideButton[];
}

export const SLIDES: SlideData[] = [
  {
    id: "cake",
    title: `Happy Birthday, ${MOM_NAME}!`,
    text: "Make a wish, then blow out the candles.",
    buttons: [{ id: "blow", label: "Blow out the candles 🎂" }],
  },
  {
    id: "star",
    title: "May you always shine",
    text: "May good health, peace and happiness follow you everywhere, today and every day of this new year.",
    buttons: [],
  },
  {
    id: "flower",
    title: "May your dreams bloom",
    text: "Every dream you put aside for the family deserves its turn. May this year give you time, joy and everything you have wished for.",
    buttons: [],
  },
  {
    id: "gift",
    title: "Thank you for everything",
    text: "For every meal, every prayer and every time you believed in me first. You are the best gift I ever got.",
    buttons: [],
  },
  {
    id: "heart",
    title: `I love you, ${MOM_NAME}!`,
    text: `Happy Birthday! With all my love, ${MY_NAME}.`,
    buttons: [
      { id: "celebrate", label: "Celebrate again 🎉" },
      { id: "restart", label: "Watch from the start" },
    ],
  },
];
