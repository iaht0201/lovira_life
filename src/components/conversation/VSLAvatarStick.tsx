import React, { useEffect, useRef } from 'react';
import { VSLJoints, NEUTRAL_POSE, interpolateJoints, vslMotionService } from '../../services/vslMotionService';

interface VSLAvatarStickProps {
  currentText?: string;
  isAnimating?: boolean;
  width?: number;
  height?: number;
}

export const VSLAvatarStick: React.FC<VSLAvatarStickProps> = ({
  currentText = '',
  isAnimating = false,
  width = 280,
  height = 280,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let keyframes: VSLJoints[] = [NEUTRAL_POSE];
    if (currentText) {
      keyframes = vslMotionService.getGestureForText(currentText);
    }

    let currentPose = NEUTRAL_POSE;
    let targetKeyframeIndex = 0;
    let transitionProgress = 0;
    const transitionSpeed = 0.05;

    const drawPose = (pose: VSLJoints) => {
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2 + 20;
      const scale = Math.min(width, height) * 0.4;

      const toScreen = (pt: { x: number; y: number }) => ({
        x: centerX + pt.x * scale,
        y: centerY + pt.y * scale,
      });

      const head = toScreen(pose.head);
      const neck = toScreen(pose.neck);
      const lShoulder = toScreen(pose.leftShoulder);
      const rShoulder = toScreen(pose.rightShoulder);
      const lElbow = toScreen(pose.leftElbow);
      const rElbow = toScreen(pose.rightElbow);
      const lHand = toScreen(pose.leftHand);
      const rHand = toScreen(pose.rightHand);
      const waist = toScreen(pose.waist);

      const primaryColor = '#287C78';
      const jointColor = '#42A39E';

      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.strokeStyle = primaryColor;

      const drawLine = (from: { x: number; y: number }, to: { x: number; y: number }) => {
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      };

      const drawJoint = (pt: { x: number; y: number }, radius = 5) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = jointColor;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      };

      // Head
      ctx.beginPath();
      ctx.arc(head.x, head.y, 20, 0, Math.PI * 2);
      ctx.fillStyle = '#E4F0EF';
      ctx.fill();
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 3.5;
      ctx.stroke();

      // Eyes & Smile
      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.arc(head.x - 6, head.y - 4, 2.5, 0, Math.PI * 2);
      ctx.arc(head.x + 6, head.y - 4, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(head.x, head.y + 2, 8, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.lineWidth = 2;
      ctx.strokeStyle = primaryColor;
      ctx.stroke();

      // Skeleton Body
      ctx.lineWidth = 4;
      ctx.strokeStyle = primaryColor;

      drawLine(neck, waist);
      drawLine(neck, lShoulder);
      drawLine(neck, rShoulder);

      // Arms
      drawLine(lShoulder, lElbow);
      drawLine(lElbow, lHand);

      drawLine(rShoulder, rElbow);
      drawLine(rElbow, rHand);

      // Joints
      drawJoint(neck);
      drawJoint(lShoulder);
      drawJoint(rShoulder);
      drawJoint(lElbow, 6);
      drawJoint(rElbow, 6);
      drawJoint(lHand, 7);
      drawJoint(rHand, 7);
    };

    const animate = () => {
      const targetPose = keyframes[targetKeyframeIndex] || NEUTRAL_POSE;
      transitionProgress += transitionSpeed;

      if (transitionProgress >= 1) {
        transitionProgress = 0;
        currentPose = targetPose;
        targetKeyframeIndex = (targetKeyframeIndex + 1) % keyframes.length;
      }

      const interpolated = interpolateJoints(currentPose, targetPose, transitionProgress);
      drawPose(interpolated);

      animFrameId.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [currentText, isAnimating, width, height]);

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-lovira-card border border-lovira rounded-[20px] shadow-sm">
      <canvas ref={canvasRef} width={width} height={height} className="max-w-full h-auto" />
      <div className="mt-2 text-center">
        <span className="text-[12px] font-[700] text-[#287C78] dark:text-[#42A39E] px-3 py-1 rounded-full bg-[#E4F0EF] dark:bg-[#203A39]">
          Ngôn ngữ ký hiệu VSL
        </span>
      </div>
    </div>
  );
};
