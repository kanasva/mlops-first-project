import pandas as pd
import mlflow
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    log_loss,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.neighbors import KNeighborsClassifier

# Enable auto logging
mlflow.set_tracking_uri(
    "http://a73bb9ba3487c446db5c076266c716dc-264935089.ap-southeast-2.elb.amazonaws.com/mlflow"
)
mlflow.sklearn.autolog()

# Prepare training data
df = pd.read_csv("data/iris.csv")
flower_names = {"Setosa": 0, "Versicolor": 1, "Virginica": 2}


X = df[["sepal.length", "sepal.width", "petal.length", "petal.width"]]
y = df["variety"].map(flower_names)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)


def main():
    with mlflow.start_run() as run:
        # Train model
        knn = KNeighborsClassifier(n_neighbors=3)
        knn.fit(X_train, y_train)

        # Evaluate model
        y_proba = knn.predict_proba(X_test)
        y_pred = knn.predict(X_test)

        acc = accuracy_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred, average="weighted")
        loss = log_loss(y_test, y_proba)
        precision = precision_score(y_test, y_pred, average="weighted")
        recall = recall_score(y_test, y_pred, average="weighted")

        # Log metrics
        mlflow.log_metrics(
            {
                "testing_accuracy": acc,
                "testing_f1": f1,
                "testing_log_loss": loss,
                "testing_precision": precision,
                "testing_recall": recall,
            }
        )

    print("Run ID:", run.info.run_id)


if __name__ == "__main__":
    main()
