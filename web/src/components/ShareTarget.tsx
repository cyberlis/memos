import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Routes } from "@/router";

const ShareTarget = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleShareTarget = () => {
      // Get data from URL
      const url = new URL(window.location.href);
      const title = url.searchParams.get("title") || "";
      const text = url.searchParams.get("text") || "";
      const urlParam = url.searchParams.get("url") || "";

      const editorContent = JSON.stringify({
        title,
        text,
        url: urlParam,
      });
      // Save content to localStorage for later use in the editor
      if (title || text || urlParam) {
        localStorage.setItem("share-target-content", editorContent);
        // Redirect to the main page
        navigate(Routes.ROOT);
      }
    };

    handleShareTarget();
  }, [navigate]);

  return null; // This component doesn't render UI
};

export default ShareTarget;
