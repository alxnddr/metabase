const { H } = cy;
import { SAMPLE_DB_ID } from "e2e/support/cypress_data";
import { SAMPLE_DATABASE } from "e2e/support/cypress_sample_database";
import {
  ADMIN_PERSONAL_COLLECTION_ID,
  ORDERS_DASHBOARD_ID,
  ORDERS_QUESTION_ID,
} from "e2e/support/cypress_sample_instance_data";

const { ORDERS_ID } = SAMPLE_DATABASE;
const PG_DB_ID = 2;
const PERMISSION_ERROR = "Sorry, you don't have permission to see this card.";
const MAX_CARDS = 5;
const MAX_XRAY_WAIT_TIMEOUT = 15000;

describe("scenarios > dashboard > dashboard back navigation", () => {
  beforeEach(() => {
    H.restore();
    cy.signInAsAdmin();
    H.setActionsEnabledForDB(SAMPLE_DB_ID);

    cy.intercept("POST", "/api/dataset").as("dataset");
    cy.intercept("GET", "/api/card/*").as("card");
    cy.intercept("POST", "/api/card/*/query").as("cardQuery");
    cy.intercept("PUT", "/api/card/*").as("updateCard");
    cy.intercept("GET", "/api/dashboard/*").as("dashboard");
    cy.intercept("POST", "/api/dashboard/*/dashcard/*/card/*/query").as(
      "dashcardQuery",
    );
  });

  it("should display a back to the dashboard button when navigating to a question", () => {
    const dashboardName = "Orders in a dashboard";
    const backButtonLabel = `Back to ${dashboardName}`;

    H.visitDashboard(ORDERS_DASHBOARD_ID);
    cy.wait("@dashboard");
    cy.findByTestId("dashcard").findByText("Orders").click();
    cy.wait("@cardQuery");
    cy.findByLabelText(backButtonLabel).should("be.visible");
    H.openNotebook();
    H.summarize({ mode: "notebook" });
    H.popover().findByText("Count of rows").click();
    cy.findByLabelText(backButtonLabel).should("be.visible");
    H.visualize();
    cy.findByLabelText(backButtonLabel).click();
    H.modal().button("Discard changes").click();
    cy.findByTestId("dashboard-header")
      .findByText(dashboardName)
      .should("be.visible");

    H.getDashboardCard().realHover();
    H.getDashboardCardMenu().click();
    H.popover().findByText("Edit question").click();
    cy.findByLabelText(backButtonLabel).click();
    cy.findByTestId("dashboard-header")
      .findByText(dashboardName)
      .should("be.visible");

    H.appBar().findByText("Our analytics").click();
    cy.findByTestId("collection-table").findByText("Orders").click();
    cy.findByLabelText(backButtonLabel).should("not.exist");
  });

  it("should expand the native editor when editing a question from a dashboard", () => {
    createDashboardWithNativeCard();
    H.visitDashboard("@dashboardId");
    H.getDashboardCard().realHover();
    H.getDashboardCardMenu().click();
    H.popover().findByText("Edit question").click();
    H.NativeEditor.get().should("be.visible");

    H.queryBuilderHeader().findByLabelText("Back to Test Dashboard").click();
    H.getDashboardCard().findByText("Orders SQL").click();
    cy.findByTestId("native-query-top-bar")
      .findByText("This question is written in SQL.")
      .should("be.visible");
    H.NativeEditor.get().should("not.be.visible");
  });

  it("should display a back to the dashboard button in table x-ray dashboards", () => {
    const cardTitle = "Total transactions";
    cy.visit(`/auto/dashboard/table/${ORDERS_ID}?#show=${MAX_CARDS}`);
    cy.wait("@dataset", { timeout: MAX_XRAY_WAIT_TIMEOUT });

    H.getDashboardCards()
      .filter(`:contains("${cardTitle}")`)
      .findByText(cardTitle)
      .click();
    cy.wait("@dataset");

    H.queryBuilderHeader()
      .findByLabelText(/Back to .*Orders.*/)
      .click();

    H.getDashboardCards().filter(`:contains("${cardTitle}")`).should("exist");
  });

  it("should display a back to the dashboard button in model x-ray dashboards", () => {
    const cardTitle = "Orders by Subtotal";
    cy.request("PUT", `/api/card/${ORDERS_QUESTION_ID}`, { type: "model" });
    cy.visit(`/auto/dashboard/model/${ORDERS_QUESTION_ID}?#show=${MAX_CARDS}`);
    cy.wait("@dataset", { timeout: MAX_XRAY_WAIT_TIMEOUT });

    H.getDashboardCards()
      .filter(`:contains("${cardTitle}")`)
      .findByText(cardTitle)
      .click();
    cy.wait("@dataset");

    H.queryBuilderHeader()
      .findByLabelText(/Back to .*Orders.*/)
      .click();

    H.getDashboardCards().filter(`:contains("${cardTitle}")`).should("exist");
  });

  it("should preserve query results when navigating between the dashboard and the query builder", () => {
    createDashboardWithCards();
    H.visitDashboard("@dashboardId");
    cy.wait("@dashboard");
    cy.wait("@dashcardQuery");

    H.getDashboardCard().within(() => {
      cy.findByText("110.93").should("be.visible"); // table data
      cy.findByText("Orders").click();
      cy.wait("@cardQuery");
    });

    H.queryBuilderHeader().findByLabelText("Back to Test Dashboard").click();

    // cached data
    H.getDashboardCard(0).findByText("110.93").should("be.visible");
    H.getDashboardCard(1).findByText("Text card").should("be.visible");
    H.getDashboardCard(2).findByText("Action card").should("be.visible");

    cy.get("@dashboard.all").should("have.length", 1);
    cy.get("@dashcardQuery.all").should("have.length", 1);

    H.appBar().findByText("Our analytics").click();

    H.collectionTable().within(() => {
      cy.findByText("Test Dashboard").click();
      cy.wait("@dashboard");
      cy.wait("@dashcardQuery");
      cy.get("@dashcardQuery.all").should("have.length", 2);
    });
  });

  it("should not preserve query results when the question changes during navigation", () => {
    H.visitDashboard(ORDERS_DASHBOARD_ID);
    cy.wait("@dashboard");
    cy.wait("@dashcardQuery");

    H.getDashboardCard().within(() => {
      cy.findByText("134.91").should("be.visible"); // table data
      cy.findByText("Orders").click();
      cy.wait("@cardQuery");
    });

    H.queryBuilderHeader().within(() => {
      cy.findByDisplayValue("Orders").clear().type("Orders question").blur();
      cy.wait("@updateCard");
      cy.button(/Summarize/).click();
    });

    H.rightSidebar().within(() => {
      cy.findByText("Total").click();
    });

    H.queryBuilderHeader().within(() => {
      cy.findByText("Save").click();
    });

    cy.findByTestId("save-question-modal").within(() => {
      cy.findByText("Save").click();
      cy.wait("@updateCard");
    });

    H.queryBuilderHeader().within(() => {
      cy.findByLabelText("Back to Orders in a dashboard").click();
      cy.wait("@dashcardQuery");
      cy.get("@dashboard.all").should("have.length", 1);
    });

    H.getDashboardCard().within(() => {
      cy.findByText("Orders question").should("be.visible");
      cy.findByText("Count").should("be.visible"); // aggregated data
    });
  });

  it("should navigate back to a dashboard with permission errors", () => {
    createDashboardWithPermissionError();
    cy.signInAsNormalUser();
    H.visitDashboard("@dashboardId");
    cy.wait("@dashboard");
    cy.wait("@dashcardQuery");

    H.getDashboardCard(1).findByText(PERMISSION_ERROR);
    H.getDashboardCard(0).findByText("Orders 1").click();
    cy.wait("@card");

    H.queryBuilderHeader()
      .findByLabelText("Back to Orders in a dashboard")
      .click();

    H.getDashboardCard(1).findByText(PERMISSION_ERROR);
    cy.get("@dashboard.all").should("have.length", 1);
    cy.get("@dashcardQuery.all").should("have.length", 1);
  });

  it("should return to dashboard with specific tab selected", () => {
    H.visitDashboardAndCreateTab({
      dashboardId: ORDERS_DASHBOARD_ID,
      save: false,
    });

    // Add card to second tab
    cy.icon("pencil").click();
    H.openQuestionsSidebar();
    H.sidebar().within(() => {
      cy.findByText("Orders, Count").click();
    });
    H.saveDashboard();

    H.getDashboardCard().within(() => {
      cy.findByText("Orders, Count").click();
      cy.wait("@card");
    });

    H.queryBuilderHeader()
      .findByLabelText("Back to Orders in a dashboard")
      .click();

    cy.findByRole("tab", { selected: true }).should("have.text", "Tab 2");
  });
});

describe(
  "scenarios > dashboard > dashboard back navigation",
  { tags: ["@external", "@actions"] },
  () => {
    beforeEach(() => {
      H.restore("postgres-12");
      cy.signInAsAdmin();
      cy.intercept("GET", "/api/dashboard/*").as("dashboard");
      cy.intercept("GET", "/api/card/*").as("card");
      cy.intercept("POST", "/api/dashboard/*/dashcard/*/card/*/query").as(
        "dashcardQuery",
      );
    });

    it("should preserve filter value when navigating between the dashboard and the question without re-fetch", () => {
      // could be a regular dashboard with card and filters
      createDashboardWithSlowCard();

      cy.get("@dashboardId").then((dashboardId) => {
        cy.visit(`/dashboard/${dashboardId}`);
        cy.wait("@dashboard");
        cy.wait("@dashcardQuery");
      });

      // initial loading of the dashboard with card
      cy.get("@dashcardQuery.all").should("have.length", 1);

      H.filterWidget().findByPlaceholderText("sleep").clear().type("1{enter}");

      cy.wait("@dashcardQuery");

      // we applied filter, so the data is requested again
      cy.get("@dashcardQuery.all").should("have.length", 2);

      cy.log("drill down to the question");
      H.getDashboardCard().within(() => {
        cy.findByText("Sleep card").click();
      });

      H.filterWidget().findByPlaceholderText("sleep").should("have.value", "1");
      // if we do not wait for this query, it's canceled and re-trigered on dashboard
      cy.wait("@card");

      cy.log("navigate back to the dashboard");
      H.queryBuilderHeader().findByLabelText("Back to Sleep dashboard").click();

      H.getDashboardCard().within(() => {
        cy.findByText("Sleep card").should("be.visible");
      });

      H.filterWidget().findByPlaceholderText("sleep").should("have.value", "1");

      // cached data is used, no re-fetching should happen
      cy.get("@dashcardQuery.all").should("have.length", 2);
    });

    // be careful writing a test after this one. tests order matters.
    // cypress will not cancel the request with slow response after the test is finished
    // so it will affect interception of @dashcardQuery and mess up the number of requests
    it("should restore a dashboard with loading cards and re-fetch query data", () => {
      createDashboardWithSlowCard();
      cy.get("@dashboardId").then((dashboardId) => {
        cy.visit({
          url: `/dashboard/${dashboardId}`,
          qs: { sleep: 60 },
        });
      });
      cy.wait("@dashboard");

      H.getDashboardCard().within(() => {
        cy.findByTestId("loading-indicator").should("be.visible");
        cy.findByText("Sleep card").click();
        cy.wait("@card");
      });

      H.queryBuilderHeader().within(() => {
        cy.findByLabelText("Back to Sleep dashboard").click();
      });

      H.getDashboardCard().within(() => {
        cy.findByText("Sleep card").should("be.visible");
      });

      // dashboard is taken from the cache, no re-fetch
      cy.get("@dashboard.all").should("have.length", 1);
      // the query is triggered second time as first one never loaded - no value in the cache
      cy.get("@dashcardQuery.all").should("have.length", 2);
    });
  },
);

const createDashboardWithCards = () => {
  const questionDetails = {
    name: "Orders",
    query: { "source-table": ORDERS_ID },
  };

  const modelDetails = {
    name: "Orders model",
    query: { "source-table": ORDERS_ID },
    type: "model",
  };

  const actionDetails = {
    name: "Update orders quantity",
    type: "query",
    database_id: SAMPLE_DB_ID,
    dataset_query: {
      database: SAMPLE_DB_ID,
      native: {
        query: "UPDATE orders SET quantity = quantity",
      },
      type: "native",
    },
    parameters: [],
    visualization_settings: {
      type: "button",
    },
  };

  const questionDashcardDetails = {
    row: 0,
    col: 0,
    size_x: 8,
    size_y: 8,
    visualization_settings: {},
  };

  H.createDashboard().then(({ body: { id: dashboard_id } }) => {
    H.createQuestion(questionDetails).then(({ body: { id: question_id } }) => {
      H.createQuestion(modelDetails).then(({ body: { id: model_id } }) => {
        H.createAction({ ...actionDetails, model_id }).then(
          ({ body: { id: action_id } }) => {
            cy.request("PUT", `/api/dashboard/${dashboard_id}`, {
              dashcards: [
                { id: -1, card_id: question_id, ...questionDashcardDetails },
                H.getTextCardDetails({ id: -2, size_y: 1 }),
                H.getActionCardDetails({ id: -3, action_id }),
              ],
            });
          },
        );
      });
    });

    cy.wrap(dashboard_id).as("dashboardId");
  });
};

const createDashboardWithNativeCard = () => {
  const questionDetails = {
    name: "Orders SQL",
    native: {
      query: "SELECT * FROM ORDERS",
    },
  };

  H.createNativeQuestionAndDashboard({ questionDetails }).then(
    ({ body: { dashboard_id } }) => cy.wrap(dashboard_id).as("dashboardId"),
  );
};

const createDashboardWithSlowCard = () => {
  const questionDetails = {
    name: "Sleep card",
    database: PG_DB_ID,
    native: {
      query: "SELECT {{sleep}}, pg_sleep({{sleep}});",
      "template-tags": {
        sleep: {
          id: "fake-uuid",
          name: "sleep",
          "display-name": "sleep",
          type: "number",
          default: 0,
        },
      },
    },
  };

  const filterDetails = {
    name: "sleep",
    slug: "sleep",
    id: "96917420",
    type: "number/=",
    sectionId: "number",
    default: 0,
  };

  const dashboardDetails = {
    name: "Sleep dashboard",
    parameters: [filterDetails],
  };

  const dashcardDetails = {
    row: 0,
    col: 0,
    size_x: 8,
    size_y: 8,
  };

  const parameterMapping = {
    parameter_id: filterDetails.id,
    target: ["variable", ["template-tag", "sleep"]],
  };

  H.createNativeQuestionAndDashboard({
    questionDetails,
    dashboardDetails,
  }).then(({ body: { id, card_id, dashboard_id } }) => {
    cy.request("PUT", `/api/dashboard/${dashboard_id}`, {
      dashcards: [
        {
          id,
          card_id,
          ...dashcardDetails,
          parameter_mappings: [{ ...parameterMapping, card_id }],
        },
      ],
    });

    cy.wrap(dashboard_id).as("dashboardId");
  });
};

const createDashboardWithPermissionError = () => {
  const question1Details = {
    name: "Orders 1",
    query: { "source-table": ORDERS_ID },
  };

  const question2Details = {
    name: "Orders 2",
    query: { "source-table": ORDERS_ID },
    collection_id: ADMIN_PERSONAL_COLLECTION_ID,
  };

  const dashboardDetails = {
    name: "Orders in a dashboard",
  };

  const dashcard1Details = {
    row: 0,
    col: 0,
    size_x: 8,
    size_y: 8,
  };

  const dashcard2Details = {
    row: 0,
    col: 8,
    size_x: 8,
    size_y: 8,
  };

  H.createQuestion(question1Details).then(({ body: { id: card_id_1 } }) => {
    H.createQuestion(question2Details).then(({ body: { id: card_id_2 } }) => {
      H.createDashboard(dashboardDetails).then(
        ({ body: { id: dashboard_id } }) => {
          cy.request("PUT", `/api/dashboard/${dashboard_id}`, {
            dashcards: [
              { id: -1, card_id: card_id_1, ...dashcard1Details },
              { id: -2, card_id: card_id_2, ...dashcard2Details },
            ],
          });

          cy.wrap(dashboard_id).as("dashboardId");
        },
      );
    });
  });
};
