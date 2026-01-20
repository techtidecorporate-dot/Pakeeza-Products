

import React, { useState } from "react";
import ChatBot from "./chatbot";
import SplashScreen from "./SplashScreen";

export default function Index() {
  const [showSplash, setShowSplash] = useState(true);

  return showSplash ? (
    <SplashScreen onFinish={() => setShowSplash(false)} />
  ) : (
    <ChatBot />
  );
}
