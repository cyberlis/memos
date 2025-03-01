import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isValidUrl } from "@/helpers/utils";
import { Routes } from "@/router";

const ShareTarget = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleShareTarget = () => {
      try {
        // Get data from URL
        const url = new URL(window.location.href);
        const title = url.searchParams.get("title") || "";
        const text = url.searchParams.get("text") || "";
        const urlParam = url.searchParams.get("url") || "";

        // If there are share target parameters
        if (title || text || urlParam) {
          // Form data for the editor
          let editorContent = "";

          // If URL is provided, use it
          if (urlParam) {
            if (title) {
              // If title exists, create a markdown link
              editorContent = `[${title}](${urlParam})`;
            } else {
              // Otherwise just the URL
              editorContent = urlParam;
            }
          }
          // If text is provided, use it
          else if (text) {
            editorContent = text;
          }

          // Save content to localStorage for later use in the editor
          if (editorContent) {
            localStorage.setItem("share-target-content", editorContent);

            // Redirect to the main page
            navigate(Routes.ROOT);
          }
        }
      } catch (error) {
        console.error("Error handling share target:", error);
      }
    };

    handleShareTarget();
  }, [navigate]);

  return null; // This component doesn't render UI
};

export default ShareTarget;
