import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { NavigationRow } from "../navigation-row";

describe("NavigationRow", () => {
  const defaultProps = {
    label: "April 2026",
    onPrev: jest.fn(),
    onNext: jest.fn(),
    onToday: jest.fn(),
  };

  // NR1
  test("shows period label", () => {
    const { getByTestId } = render(<NavigationRow {...defaultProps} />);
    expect(getByTestId("period-label").props.children).toBe("April 2026");
  });

  // NR2
  test("left chevron calls onPrev", () => {
    const onPrev = jest.fn();
    const { getByTestId } = render(
      <NavigationRow {...defaultProps} onPrev={onPrev} />,
    );
    fireEvent.press(getByTestId("nav-prev"));
    expect(onPrev).toHaveBeenCalled();
  });

  // NR3
  test("right chevron calls onNext", () => {
    const onNext = jest.fn();
    const { getByTestId } = render(
      <NavigationRow {...defaultProps} onNext={onNext} />,
    );
    fireEvent.press(getByTestId("nav-next"));
    expect(onNext).toHaveBeenCalled();
  });

  // NR4
  test("today button calls onToday", () => {
    const onToday = jest.fn();
    const { getByTestId } = render(
      <NavigationRow {...defaultProps} onToday={onToday} />,
    );
    fireEvent.press(getByTestId("nav-today"));
    expect(onToday).toHaveBeenCalled();
  });

  // NR5
  test("chevrons have accessibility labels", () => {
    const { getByTestId } = render(<NavigationRow {...defaultProps} />);
    expect(getByTestId("nav-prev").props.accessibilityLabel).toBe("Previous period");
    expect(getByTestId("nav-next").props.accessibilityLabel).toBe("Next period");
  });
});
