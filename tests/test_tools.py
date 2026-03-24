from app.tools import calculate_area

def test_calculate_area():
    assert calculate_area(5.0, 4.0) == 20.0
    assert calculate_area(0.0, 10.0) == 0.0
    assert calculate_area(2.5, 2.0) == 5.0
