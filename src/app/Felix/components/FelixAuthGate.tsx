"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { verifyPassword, checkAuth } from "../actions";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

function PasswordGate({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await verifyPassword(password);
      if (result.success) onAuthenticated();
      else {
        setError(result.message);
        setPassword("");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-bold">Protected Case Study</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="password"
                label="Password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                isInvalid={!!error}
                errorMessage={error}
                disabled={isLoading}
              />
              <Button
                type="submit"
                color="primary"
                className="w-full"
                isLoading={isLoading}
              >
                Access Case Study
              </Button>
            </form>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
}

export default function FelixAuthGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAuth().then((authenticated) => {
      setIsAuthenticated(authenticated);
      setIsChecking(false);
    });
  }, []);

  if (isChecking)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-default-500">Loading...</div>
      </div>
    );

  return isAuthenticated ? (
    <>{children}</>
  ) : (
    <PasswordGate onAuthenticated={() => setIsAuthenticated(true)} />
  );
}
