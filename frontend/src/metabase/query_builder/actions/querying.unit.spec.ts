import * as Lib from "metabase-lib";
import type Question from "metabase-lib/v1/Question";

import { RESET_ROW_ZOOM } from "./object-detail";
import { queryCompleted } from "./querying";

describe("querying", () => {
  describe("queryCompleted", () => {
    it("should reset object detail zoom when result count changes", () => {
      // Mock a Redux state with an active object detail zoom and previous results
      const getState = () => ({
        qb: {
          zoomedRowObjectId: 12,
          queryResults: [
            {
              data: {
                rows: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
              },
            },
          ],
        },
      });

      // Mock dispatch function
      const dispatch = jest.fn();

      // Mock question and query result with a different row count
      const question = {} as Question;
      jest
        .spyOn(Lib, "queryDisplayInfo")
        .mockReturnValue({ isEditable: false });

      const queryResults = [
        {
          data: {
            rows: [1, 2, 3, 4, 5, 6, 7, 8, 9],
          },
        },
      ] as any;

      // Call the action creator
      queryCompleted(question, queryResults)(dispatch, getState, undefined);

      // Verify RESET_ROW_ZOOM was dispatched
      const resetRowZoomAction = dispatch.mock.calls.find(
        (call) => call[0].type === RESET_ROW_ZOOM,
      );
      expect(resetRowZoomAction).toBeDefined();
    });

    it("should not reset object detail zoom when result count remains the same", () => {
      // Mock state with same row count
      const getState = () => ({
        qb: {
          zoomedRowObjectId: 5,
          queryResults: [
            {
              data: {
                rows: [1, 2, 3, 4, 5, 6, 7, 8, 9],
              },
            },
          ],
        },
      });

      const dispatch = jest.fn();
      const question = {} as Question;
      jest
        .spyOn(Lib, "queryDisplayInfo")
        .mockReturnValue({ isEditable: false });

      // Same row count as the previous result
      const queryResults = [
        {
          data: {
            rows: [1, 2, 3, 4, 5, 6, 7, 8, 9],
          },
        },
      ] as any;

      queryCompleted(question, queryResults)(dispatch, getState, undefined);

      // Verify RESET_ROW_ZOOM was NOT dispatched
      const resetRowZoomAction = dispatch.mock.calls.find(
        (call) => call[0].type === RESET_ROW_ZOOM,
      );
      expect(resetRowZoomAction).toBeUndefined();
    });

    it("should not reset object detail zoom when not in object detail view", () => {
      // Mock state with no object detail zoom active
      const getState = () => ({
        qb: {
          zoomedRowObjectId: null,
          queryResults: [
            {
              data: {
                rows: [1, 2, 3, 4, 5],
              },
            },
          ],
        },
      });

      const dispatch = jest.fn();
      const question = {} as Question;
      jest
        .spyOn(Lib, "queryDisplayInfo")
        .mockReturnValue({ isEditable: false });

      // Different row count
      const queryResults = [
        {
          data: {
            rows: [1, 2, 3],
          },
        },
      ] as any;

      queryCompleted(question, queryResults)(dispatch, getState, undefined);

      // Verify RESET_ROW_ZOOM was NOT dispatched
      const resetRowZoomAction = dispatch.mock.calls.find(
        (call) => call[0].type === RESET_ROW_ZOOM,
      );
      expect(resetRowZoomAction).toBeUndefined();
    });
  });
});
