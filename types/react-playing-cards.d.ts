declare module '@heruka_urgyen/react-playing-cards' {
  import { ComponentType } from 'react';

  interface PlayingCardProps {
    card?: string;
    back?: boolean;
    height?: number;
    deckType?: string;
    style?: React.CSSProperties;
    className?: string;
  }

  const Card: ComponentType<PlayingCardProps>;
  export default Card;
}

declare module '@heruka_urgyen/react-playing-cards/lib/TcN' {
  import { ComponentType } from 'react';

  interface PlayingCardProps {
    card?: string;
    back?: boolean;
    height?: number;
    style?: React.CSSProperties;
    className?: string;
  }

  const TcN: ComponentType<PlayingCardProps>;
  export default TcN;
}
