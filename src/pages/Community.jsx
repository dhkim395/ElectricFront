import React from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaSearch, FaRegCommentDots, FaPen } from "react-icons/fa";
import "./Community.css";

export default function Community() {
  const navigate = useNavigate();

  const dummyPosts = [
    {
      id: 1,
      author: "양하용",
      time: "8시간전",
      title: "마들공원 충전기",
      comments: 1,
    },
    {
      id: 2,
      author: "김혜진",
      time: "2025.06.03",
      title: "아토3도 등록해주세요",
      comments: 1,
    },
    {
      id: 3,
      author: "고현서",
      time: "2025.06.02",
      title: "처음 충전했는데....",
      comments: 2,
    },
    {
      id: 4,
      author: "김동현",
      time: "2025.06.01",
      title: "여기 짱 좋네요...!!!",
      comments: 0,
    },
  ];

  return (
    <div className="community-page">
      {/* 상단 바 */}
      <div className="community-header">
        <FaArrowLeft className="back-icon" onClick={() => navigate(-1)} />
        <div className="community-title">커뮤니티</div>
        <FaSearch className="search-icon" />
      </div>

      {/* 배너 */}
      <div className="banner">
        <img src="/img/community-banner.png" alt="배너" />
      </div>

      {/* 설명 + 탭 */}
      <div className="community-tabs">
        <button className="tab active">최신</button>
        <button className="tab">인기</button>
      </div>

      {/* 게시글 목록 */}
      <div className="post-list">
        {dummyPosts.map((post) => (
          <div key={post.id} className="post-card">
            <div className="profile-circle" />
            <div className="post-content">
              <div className="post-author-time">
                <span className="author">{post.author}</span>
                <span className="time">{post.time}</span>
              </div>
              <div className="post-title">{post.title}</div>
              <div className="post-comment">
                <FaRegCommentDots size={13} />
                <span>{post.comments}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 글쓰기 버튼 */}
      <button className="write-button">
        <FaPen style={{ marginRight: 4 }} />
        글쓰기
      </button>
    </div>
  );
}
