import { addUndo } from "metabase/redux/undo";
import Question from "metabase-lib/v1/Question";
import { apiUpdateQuestion } from "./core";
import { updateUrl } from "./navigation";
import { turnModelIntoQuestion, turnQuestionIntoModel } from "./models";
import { getQuestion } from "../selectors";

// We don't need to mock react-router-redux directly since we're mocking updateUrl

jest.mock("../selectors", () => ({
  getQuestion: jest.fn(),
}));

jest.mock("metabase/redux/undo", () => ({
  addUndo: jest.fn(),
}));

jest.mock("./core", () => ({
  apiUpdateQuestion: jest.fn(() => () => Promise.resolve()),
  updateQuestion: jest.fn(),
}));

jest.mock("./navigation", () => ({
  updateUrl: jest.fn(),
}));

describe("models actions", () => {
  let question: Question;
  let model: Question;
  let dispatch: jest.Mock;
  let getState: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    question = {
      id: () => 123,
      setType: jest.fn().mockReturnThis(),
      setPinned: jest.fn().mockReturnThis(),
      setDisplay: jest.fn().mockReturnThis(),
      setSettings: jest.fn().mockReturnThis(),
    } as unknown as Question;
    
    // When turning a model into a question
    const convertedQuestion = {
      id: () => 123,
      setType: jest.fn().mockReturnThis(),
    } as unknown as Question;
    
    model = {
      id: () => 123,
      setType: jest.fn().mockReturnValue(convertedQuestion),
    } as unknown as Question;
    
    dispatch = jest.fn().mockImplementation(action => {
      if (typeof action === "function") {
        return action(dispatch, getState);
      }
      return action;
    });
    
    getState = jest.fn();
  });

  describe("turnQuestionIntoModel", () => {
    beforeEach(() => {
      (getQuestion as jest.Mock).mockReturnValue(question);
    });

    it("should update question to model and replace state in history", async () => {
      await dispatch(turnQuestionIntoModel());

      expect(question.setType).toHaveBeenCalledWith("model");
      expect(question.setPinned).toHaveBeenCalledWith(true);
      expect(question.setDisplay).toHaveBeenCalledWith("table");
      expect(question.setSettings).toHaveBeenCalledWith({});
      expect(apiUpdateQuestion).toHaveBeenCalled();
      expect(updateUrl).toHaveBeenCalledWith(expect.anything(), { replaceState: true });
      expect(addUndo).toHaveBeenCalled();
    });
  });

  describe("turnModelIntoQuestion", () => {
    beforeEach(() => {
      (getQuestion as jest.Mock).mockReturnValue(model);
    });

    it("should update model to question and replace state in history", async () => {
      await dispatch(turnModelIntoQuestion());

      expect(model.setType).toHaveBeenCalledWith("question");
      expect(apiUpdateQuestion).toHaveBeenCalled();
      expect(updateUrl).toHaveBeenCalledWith(expect.anything(), { replaceState: true });
      expect(addUndo).toHaveBeenCalled();
    });
  });
});