// auth.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ربط المشروع بـ Supabase
const supabase = createClient(
  "https://qchuzlphsabbuelwhqav.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjaHV6bHBoc2FiYnVlbHdocWF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMjgxNjgsImV4cCI6MjA3ODcwNDE2OH0.ERQT4D0HZJvMVK1jkQ8VX8ySbldipG-JCMgrEvmN21U"
);

// العناصر
const googleLoginBtn = document.getElementById("googleLogin");

// عند الضغط على زر تسجيل الدخول باستخدام جوجل
googleLoginBtn.addEventListener("click", async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + "/pages/index.html"
    }
  });

  if (error) {
    console.error("خطأ في تسجيل الدخول:", error.message);
    alert("حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى.");
    return;
  }

  // Supabase سيقوم بتحويل المستخدم إلى جوجل، وبعد تسجيل الدخول يرجع هنا
  localStorage.setItem("logged_in", "true");
});