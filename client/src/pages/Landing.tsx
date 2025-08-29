import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      if (!user.subscriptionTier) {
        setLocation("/subscription");
      } else {
        setLocation("/home");
      }
    }
  }, [user, setLocation]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="hero-bg relative min-h-screen bg-gradient-to-br from-accent to-primary flex items-center justify-center">
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="relative z-10 text-center px-6 max-w-4xl animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Welcome to <span className="text-yellow-400">ProMo-G</span>
          </h1>
          <p className="text-xl md:text-2xl text-white mb-4">
            Here every scroll 👨🏽‍💻, swipe 🤳🏼, and Every Tap pays 💱
          </p>
          <p className="text-lg text-gray-200 mb-8">
            You scroll every day for no pay, 🥱 Now, Here is a chance to earn
            with every scroll/swipe 🤑
          </p>

          {/* About Section */}
          <section
            style={{
              maxWidth: "960px",
              margin: "4rem auto",
              fontFamily: "sans-serif",
              color: "#333",
              background: "transparent",
              position: "relative",
              zIndex: 5,
            }}
          >
            {/* Top full-width card */}
            <div
              style={{
                background: "#5c9670",
                borderRadius: "12px",
                padding: "1.5rem",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                marginBottom: "1.5rem",
              }}
            >
              <p style={{ fontSize: "1rem", lineHeight: "1.6" }}>
                The tasks we manage involve specific skill sets tailored to the
                evolving needs of our clients ranging from; AI training, app and
                website testing, surveys and polls, to social media engagement
                and staying aligned with current tech trends.
              </p>
            </div>

            {/* Center two-block row */}
            <div
              style={{
                display: "flex",
                gap: "1rem",
                marginBottom: "1.5rem",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  flex: "1 1 300px",
                  background: "#8a7637",
                  borderRadius: "12px",
                  padding: "1rem",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
              >
                <p style={{ fontSize: "0.95rem", lineHeight: "1.5" }}>
                  To ensure high-quality service delivery and optimal use of
                  various advanced, cloud based tools; many of which come with
                  significant operational costs. In some cases, a nominal fee
                  might apply. These sessions are typically one-time, though
                  participants may be informed of future opportunities to
                  upskill as needed.
                </p>
              </div>
              <div
                style={{
                  flex: "1 1 300px",
                  background: "#8a7637",
                  borderRadius: "12px",
                  padding: "1rem",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
              >
                <p style={{ fontSize: "0.95rem", lineHeight: "1.5" }}>
                  {" "}
                  To help minimize your costs while maximizing your earning
                  potential, we have built a robust system designed to track,
                  reward, and optimize every interaction. Whether it is a click,
                  a share, or a connection, each action contributes to real
                  value turning engagement into meaningful rewards. Most
                  importantly, you are rewarded at every step of the journey.
                </p>
              </div>
            </div>

            {/* Bottom slogan card */}
            <div
              style={{
                background: "#192119",
                borderRadius: "12px",
                padding: "1.25rem",
                textAlign: "center",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}
            >
              <span
                style={{
                  color: "#e8d784",
                  fontSize: "1.25rem",
                  fontWeight: "bold",
                  letterSpacing: "1px",
                  textShadow:
                    "2px 2px 0 #000, 1px 1px 2px rgba(0,0,0,0.3), 0 0 2px #000000aa",
                  display: "inline-block",
                }}
              >
                Growing Together, Delivering Excellence.
              </span>
            </div>
          </section>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => setLocation("/auth")}
              size="lg"
              className="bg-accent hover:bg-accent/90 text-white px-8 py-4 text-lg font-semibold transform hover:scale-105 transition-all"
            >
              Get Started
            </Button>
            <Button
              onClick={() => setLocation("/auth")}
              variant="outline"
              size="lg"
              className="border-2 border-white text-white hover:bg-white hover:text-gray-900 px-8 py-4 text-lg font-semibold transition-all"
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="py-16 px-6 max-w-6xl mx-auto animate-slide-up">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">About ProMo-G</h2>
          <p className="text-lg text-muted-foreground max-w-4xl mx-auto">
            We are a digital marketing platform representing major software
            companies and platforms to achieve In-person review of their newly
            developed systems. We are looking for Geeks 🤓 With proficient
            skills in AI training, App/website testing and review, Survey/Polls
            & Social Media Engagement.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <div className="team-image h-64 md:h-80 rounded-xl shadow-lg"></div>
          <div>
            <h3 className="text-2xl font-bold mb-4">
              We harness the Power of Network Marketing to achieve efficient and
              seamless Digital Marketing
            </h3>
            <p className="text-muted-foreground mb-6">
              Network marketing is not just about referrals! It is about
              building powerful money making ecosystems. By leveraging the
              proven dynamics of network marketing, through structured sharing,
              incentive actions, and word-of-mouth amplification, to create a
              money-making network.
            </p>
            <p className="text-muted-foreground">
              We created cutting-edge digital systems to track, reward, and
              optimize every interaction turning clicks into conversions, shares
              into sales, and networks into value. Best of all, we reward you
              every step of the way.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
