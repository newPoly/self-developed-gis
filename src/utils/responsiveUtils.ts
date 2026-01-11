/*
 * @Description: 响应式工具函数 - 合并px转rem相关功能
 * @Version: 1.0
 * @Author: liuhaobo
 * @Date: 2024-12-24 13:55:27
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2024-12-24 13:55:27
 * @FilePath: \leaflet-self-website\src\utils\responsiveUtils.ts
 * Copyright (C) 2024 liuhaobo. All rights reserved.
 */

import _ from "lodash";

const baseSize = 16;

// 以1920px 底图为准开发页面，动态修改根元素字体的大小
export const setDomFontSize = (): void => {
  // 当前页面宽度相对于 1920 宽的缩放比例，可根据自己需要修改。
  const scale = document.documentElement.clientWidth / 1920;
  // 设置页面根节点字体大小
  document.documentElement.style.fontSize = `${
    baseSize * Math.min(scale, 2)
  }px`;
};

// 将页面中所有元素的px单位转换为rem单位
export function convertPxToRem(): void {
  const computedStyle = window.getComputedStyle(document.documentElement);
  const fontSize = parseFloat(computedStyle.fontSize); // 获取根元素的字体大小
  const pxRegex = /(\d+)px/g;

  document.querySelectorAll("*").forEach((element) => {
    if (element instanceof HTMLElement && element.style.cssText.includes("px")) {
      element.style.cssText = element.style.cssText.replace(
        pxRegex,
        (match: string, p1: string) => {
          const remValue = parseFloat(p1) / fontSize;
          return `${remValue.toFixed(5)}rem`;
        },
      );
    }
  });
}

// 最主要的区别：onresize本身就是一个回调，多次执行会被覆盖，通过addEventLister监听多次执行就不会被覆盖，运用于循环生成多个Echarts时，改变窗口大小，Echarts图表自适应问题
window.addEventListener("resize", setDomFontSize);
