import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { SegmentedControl } from "../segmented-control";

describe("SegmentedControl", () => {
  // SC1
  test("renders three segments: Day, Week, Month", () => {
    const { getByTestID } = render(
      <SegmentedControl value="week" onChange={jest.fn()} />,
    );
    expect(getByTestID("segment-day")).toBeTruthy();
    expect(getByTestID("segment-week")).toBeTruthy();
    expect(getByTestID("segment-month")).toBeTruthy();
  });

  // SC2
  test("highlights active segment", () => {
    const { getByTestID } = render(
      <SegmentedControl value="week" onChange={jest.fn()} />,
    );
    const weekSegment = getByTestID("segment-week");
    expect(weekSegment.props.accessibilityState).toEqual({ selected: true });
  });

  // SC3
  test("calls onChange on tap of inactive segment", () => {
    const onChange = jest.fn();
    const { getByTestID } = render(
      <SegmentedControl value="week" onChange={onChange} />,
    );
    fireEvent.press(getByTestID("segment-month"));
    expect(onChange).toHaveBeenCalledWith("month");
  });

  // SC4
  test("does not call onChange for already active segment", () => {
    const onChange = jest.fn();
    const { getByTestID } = render(
      <SegmentedControl value="week" onChange={onChange} />,
    );
    fireEvent.press(getByTestID("segment-week"));
    expect(onChange).not.toHaveBeenCalled();
  });

  // SC5
  test("has accessible labels", () => {
    const { getByTestID } = render(
      <SegmentedControl value="day" onChange={jest.fn()} />,
    );
    expect(getByTestID("segment-day").props.accessibilityLabel).toBe("Day view");
    expect(getByTestID("segment-week").props.accessibilityLabel).toBe("Week view");
    expect(getByTestID("segment-month").props.accessibilityLabel).toBe("Month view");
  });
});
