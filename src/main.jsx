import React from "react";
import ReactDom from "react-dom/client";
// import './index.css'
import App from "./App.jsx";
import "./App.css";
import { BrowserRouter } from "react-router-dom";

// 1. ReactDOM.createRoot(...).render(...)는 #root에 React를 연결합니다.
// 2. BrowserRouter는 React Router의 기능을 켜주는 컴포넌트입니다.→ URL 경로에 따라 페이지를 전환할 수 있게 해줍니다.
// 3. App은 전체 앱의 라우팅 중심 역할을 하는 컴포넌트입니다.
ReactDom.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

//BrowserRouter: HTML5 history API를 사용한 클라이언트 사이드 라우팅을 지원
