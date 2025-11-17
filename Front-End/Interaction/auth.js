import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://qchuzlphsabbuelwhqav.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjaHV6bHBoc2FiYnVlbHdocWF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMjgxNjgsImV4cCI6MjA3ODcwNDE2OH0.ERQT4D0HZJvMVK1jkQ8VX8ySbldipG-JCMgrEvmN21U"
);

// العناصر الأساسية
const msg = document.getElementById("msg");
const sendCodeBtn = document.getElementById("sendCodeBtn");
const verifyOtpBtn = document.getElementById("verifyOtpBtn");
const otpSection = document.getElementById("otpSection");
const ingrop = document.querySelectorAll(".hidden-send");

// حقول OTP
const otpInputs = document.querySelectorAll(".otp-input");

// إرسال الكود
sendCodeBtn.addEventListener("click", async () => {
  const countryCode = document.getElementById("countryCode").value.trim();
  const phone = document.getElementById("phone").value.trim();

  if (!phone) {
    msg.textContent = "من فضلك أدخل رقم الهاتف.";
    return;
  }

  const fullPhone = countryCode + phone;
  msg.textContent = "جاري إرسال الكود...";

  try {
    const res = await fetch("http://127.0.0.1:3000/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: fullPhone })
    });
    const data = await res.json();

    if (data.success) {
      ingrop.forEach((e) => (e.style.display = "none"));
      sendCodeBtn.style.display = "none";
      otpSection.style.display = "block"; // إظهار قسم OTP
      msg.textContent = "تم إرسال الكود على واتساب.";

      otpInputs[0].focus(); // التركيز على أول حقل OTP
    } else {
      msg.textContent = "حدث خطأ أثناء إرسال الكود.";
    }
  } catch (err) {
    msg.textContent = "خطأ في الاتصال بالخادم.";
    console.error(err);
  }
});

// التحقق من الكود
verifyOtpBtn.addEventListener("click", async () => {
  const countryCode = document.getElementById("countryCode").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const fullPhone = countryCode + phone;

  const otp = Array.from(otpInputs).map((i) => i.value).join("");

  if (otp.length < 4) {
    msg.textContent = "أدخل الكود بالكامل.";
    return;
  }

  const { data, error } = await supabase
    .from("whatsapp_otp")
    .select("*")
    .eq("phone", fullPhone)
    .eq("code", otp)
    .single();

  if (data) {
    localStorage.setItem("logged_in", "true");
    window.location.href = "/pages/index.html";
  } else {
    msg.textContent = "الكود غير صحيح.";
  }
});

// الانتقال بين حقول OTP تلقائيًا
otpInputs.forEach((input, idx) => {
  input.addEventListener("input", () => {
    if (input.value.length === 1 && idx < otpInputs.length - 1) {
      otpInputs[idx + 1].focus();
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !input.value && idx > 0) {
      otpInputs[idx - 1].focus();
    }
  });
});