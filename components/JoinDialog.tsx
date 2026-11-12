"use client";

import { createContext, useContext, useState } from "react";

const JoinContext = createContext<() => void>(() => {});

export function JoinProvider({
  siteName,
  siteUrl,
  children,
}: {
  siteName: string;
  siteUrl: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <JoinContext.Provider value={() => setOpen(true)}>
      {children}
      <div className={`join-discord${open ? " show" : ""}`} id="join-discord">
        <div className="title">WHY JOIN DISCORD</div>
        <img
          src="/img/close-black.png"
          width={20}
          alt=""
          id="discord-close"
          onClick={() => setOpen(false)}
        />
        <div className="lines">
          <div>Send product photos to our customer service, and they&apos;ll help you find what you&apos;re looking for!</div>
          <div>Ready to place an order? Contact our customer service on discord to get a more discount!</div>
        </div>
        <a href={siteUrl} className="link" target="_blank" rel="noreferrer">
          Join {siteName}
        </a>
      </div>
    </JoinContext.Provider>
  );
}

export function JoinButton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const open = useContext(JoinContext);
  return (
    <a
      href="#"
      className={className}
      onClick={(event) => {
        event.preventDefault();
        open();
      }}
    >
      {children}
    </a>
  );
}
