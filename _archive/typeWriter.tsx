"use client";

import Typewriter from "typewriter-effect";
import ReactDOMServer from "react-dom/server";

interface TypeWriterProps {
  strings: React.ReactNode[];
  cursorClassName?: string;
}

const TypeWriter: React.FC<TypeWriterProps> = ({ strings, cursorClassName }) => {
  const stringsArray = strings.map((string) =>
    ReactDOMServer.renderToString(string)
  );
  return (
    <Typewriter
      options={{
        cursorClassName: cursorClassName,
      }}
      onInit={(typewriter) => {
        stringsArray.forEach((string, index) => {
          typewriter
            .callFunction(() => {
              console.log(string);
            })
            .typeString(string as string)
            .pauseFor(2500);

          if (index !== strings.length - 1) {
            typewriter.deleteAll().callFunction(() => {
              console.log("All strings were deleted");
              console.log(index);
            });
          } else {
            console.log("All strings written ");
          }
        });
        typewriter.start();
      }}
    />
  );
};

export default TypeWriter;
